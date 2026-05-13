import { Platform } from "react-native";

import { $user, vexService } from "@vex-chat/store";

import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { atom } from "nanostores";

const ENABLED_STORE_KEY = "vex.pushNotifications.enabled.v1";
const SUBSCRIPTION_KEY_PREFIX = "vex.pushNotifications.subscription.v1";
const PUSH_CHANNEL_ID = "vex-push";

export type PushNotificationStatus =
    | "denied"
    | "disabled"
    | "error"
    | "idle"
    | "permission_needed"
    | "subscribed"
    | "subscribing";

interface ExpoConfigWithProjectID {
    extra?: {
        eas?: {
            projectId?: unknown;
        };
    };
}

interface StoredSubscription {
    subscriptionID: string;
    token: string;
}

export const $pushNotificationsEnabled = atom<boolean>(true);
export const $pushNotificationStatus = atom<PushNotificationStatus>("idle");

let preferenceHydration: null | Promise<void> = null;

export async function hydratePushNotificationPreference(): Promise<void> {
    if (!preferenceHydration) {
        preferenceHydration = readPushNotificationPreference();
    }
    await preferenceHydration;
}

export async function reconcilePushNotificationSubscription(): Promise<void> {
    await hydratePushNotificationPreference();
    if (!$pushNotificationsEnabled.get()) {
        $pushNotificationStatus.set("disabled");
        return;
    }

    $pushNotificationStatus.set("subscribing");
    try {
        logPush("reconciling subscription", {
            platform: Platform.OS,
        });
        const token = await getExpoPushTokenIfAllowed();
        if (!token) {
            logPush("subscription skipped; no push token available");
            return;
        }
        logPush("expo push token ready", {
            token: redactToken(token),
        });

        const previous = await readStoredSubscription();
        if (previous) {
            logPush("found stored subscription", {
                subscriptionID: previous.subscriptionID,
                tokenMatches: previous.token === token,
            });
        }
        const subscription = await vexService.subscribePushNotifications({
            channel: "expo",
            events: ["mail", "deviceRequest", "deviceListChanged"],
            platform:
                Platform.OS === "android" || Platform.OS === "ios"
                    ? Platform.OS
                    : "web",
            token,
        });

        await writeStoredSubscription({
            subscriptionID: subscription.subscriptionID,
            token,
        });
        logPush("server subscription stored", {
            subscriptionID: subscription.subscriptionID,
        });

        if (
            previous &&
            previous.subscriptionID !== subscription.subscriptionID
        ) {
            logPush("removing stale server subscription", {
                subscriptionID: previous.subscriptionID,
            });
            await vexService
                .unsubscribePushNotifications(previous.subscriptionID)
                .catch(() => {
                    /* best-effort cleanup of stale token row */
                });
        }

        $pushNotificationStatus.set("subscribed");
    } catch (err: unknown) {
        console.warn(
            "[vex-push] subscription failed",
            err instanceof Error ? err.message : String(err),
        );
        $pushNotificationStatus.set("error");
    }
}

export async function setPushNotificationsEnabled(
    enabled: boolean,
): Promise<void> {
    await hydratePushNotificationPreference();
    $pushNotificationsEnabled.set(enabled);
    await SecureStore.setItemAsync(ENABLED_STORE_KEY, enabled ? "1" : "0");
    if (enabled) {
        await reconcilePushNotificationSubscription();
        return;
    }

    $pushNotificationStatus.set("disabled");
    const previous = await readStoredSubscription();
    if (!previous) {
        return;
    }
    try {
        await vexService.unsubscribePushNotifications(previous.subscriptionID);
        await clearStoredSubscription();
    } catch (err: unknown) {
        console.warn(
            "[vex-push] subscription disable cleanup failed",
            err instanceof Error ? err.message : String(err),
        );
        $pushNotificationStatus.set("error");
    }
}

export async function unsubscribeStoredPushNotificationSubscription(
    userID: string,
): Promise<void> {
    const previous = await readStoredSubscription(userID);
    if (!previous) {
        return;
    }
    try {
        logPush("removing stored subscription", {
            subscriptionID: previous.subscriptionID,
            userID,
        });
        await vexService.unsubscribePushNotifications(previous.subscriptionID);
        await clearStoredSubscription(userID);
    } catch (err: unknown) {
        console.warn(
            "[vex-push] stored subscription cleanup failed",
            err instanceof Error ? err.message : String(err),
        );
    }
}

async function clearStoredSubscription(userID?: string): Promise<void> {
    await SecureStore.deleteItemAsync(subscriptionStoreKey(userID));
}

async function ensureAndroidPushChannel(): Promise<void> {
    if (Platform.OS !== "android") {
        return;
    }
    logPush("ensuring android notification channel", {
        channelID: PUSH_CHANNEL_ID,
    });
    await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
        importance: AndroidImportance.HIGH,
        name: "Push notifications",
        vibrationPattern: [0, 250],
    });
}

async function getExpoPushToken(): Promise<string> {
    const projectId =
        (Constants.expoConfig as ExpoConfigWithProjectID | null | undefined)
            ?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (typeof projectId !== "string" || projectId.length === 0) {
        throw new Error("Expo project id is unavailable.");
    }
    logPush("requesting expo push token", {
        projectID: projectId,
    });
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
}

async function getExpoPushTokenIfAllowed(): Promise<null | string> {
    await ensureAndroidPushChannel();
    const existing = await Notifications.getPermissionsAsync();
    logPush("notification permission state", {
        canAskAgain: existing.canAskAgain,
        granted: existing.granted,
        status: existing.status,
    });
    if (isNotificationPermissionGranted(existing)) {
        return getExpoPushToken();
    }

    if (!existing.canAskAgain) {
        $pushNotificationStatus.set("denied");
        return null;
    }

    $pushNotificationStatus.set("permission_needed");
    logPush("requesting notification permission");
    const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    logPush("notification permission request result", {
        canAskAgain: requested.canAskAgain,
        granted: requested.granted,
        status: requested.status,
    });
    if (!isNotificationPermissionGranted(requested)) {
        $pushNotificationStatus.set("denied");
        return null;
    }
    return getExpoPushToken();
}

function isNotificationPermissionGranted(
    settings: Notifications.NotificationPermissionsStatus,
): boolean {
    return (
        settings.granted ||
        settings.ios?.status === IosAuthorizationStatus.PROVISIONAL
    );
}

function logPush(message: string, details?: Record<string, unknown>): void {
    if (details) {
        console.info(`[vex-push] ${message}`, details);
        return;
    }
    console.info(`[vex-push] ${message}`);
}

async function readPushNotificationPreference(): Promise<void> {
    try {
        const raw = await SecureStore.getItemAsync(ENABLED_STORE_KEY);
        $pushNotificationsEnabled.set(raw !== "0");
        $pushNotificationStatus.set(raw === "0" ? "disabled" : "idle");
    } catch {
        $pushNotificationsEnabled.set(true);
        $pushNotificationStatus.set("idle");
    }
}

async function readStoredSubscription(
    userID?: string,
): Promise<null | StoredSubscription> {
    try {
        const raw = await SecureStore.getItemAsync(
            subscriptionStoreKey(userID),
        );
        if (!raw) {
            return null;
        }
        const parsed: unknown = JSON.parse(raw);
        if (
            typeof parsed === "object" &&
            parsed !== null &&
            "subscriptionID" in parsed &&
            "token" in parsed &&
            typeof (parsed as { subscriptionID: unknown }).subscriptionID ===
                "string" &&
            typeof (parsed as { token: unknown }).token === "string"
        ) {
            return parsed as StoredSubscription;
        }
    } catch {
        // Treat corrupt storage as no subscription.
    }
    return null;
}

function redactToken(token: string): string {
    if (token.length <= 16) {
        return token;
    }
    return `${token.slice(0, 10)}...${token.slice(-6)}`;
}

function subscriptionStoreKey(userID = $user.get()?.userID): string {
    return `${SUBSCRIPTION_KEY_PREFIX}.${userID ?? "anonymous"}`;
}

async function writeStoredSubscription(
    subscription: StoredSubscription,
): Promise<void> {
    await SecureStore.setItemAsync(
        subscriptionStoreKey(),
        JSON.stringify(subscription),
    );
}
