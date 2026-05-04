import type { Message } from "@vex-chat/libvex";

import { Platform } from "react-native";

import { shouldNotify } from "@vex-chat/store";
import {
    $avatarVersions,
    $channels,
    $familiars,
    $servers,
} from "@vex-chat/store";

import notifee, {
    AndroidCategory,
    AndroidStyle,
    EventType,
    AndroidImportance as NotifeeAndroidImportance,
} from "@notifee/react-native";
import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";

import {
    navigateToChannel,
    navigateToConversation,
    navigateToDeviceRequests,
    navigationRef,
} from "../navigation/navigationRef";

import { buildAvatarUrl } from "./avatarUrl";

const CHANNEL_ID = "vex-messages";
// Separate channel so users can mute messages but keep account-security
// notifications loud (or vice versa) from system Settings → Notifications.
// Device-approval requests are time-bounded (the request expires on a
// short TTL) and security-relevant, so they get HIGH importance with a
// default sound regardless of the messages channel preference.
const DEVICE_APPROVAL_CHANNEL_ID = "vex-device-approval";

// Message banners show sender display name, a short message preview, optional
// group context (subtitle), and a sender avatar (iOS: Expo attachment;
// Android: Notifee largeIcon + MessagingStyle person icon). Be aware the OS
// may persist visible notification text and images in notification history,
// backups, and platform logging — a tradeoff for readable alerts.
//
// iOS always shows the app icon on the compact banner; the sender attachment
// appears in the expanded notification / notification list. Replacing the
// banner icon with the sender requires Apple Communication Notifications
// (special entitlement + server push patterns). Android requires a
// monochrome smallIcon in the status bar; the sender avatar is shown as
// largeIcon / MessagingStyle person art where the OS allows.
//
// Android message taps use Notifee (`displayNotification`); routing data is
// also queued from `onBackgroundEvent` in index.js until NavigationContainer
// is ready (`flushPendingNotificationRoutes`).
//
// Routing still uses opaque IDs in `data` for `handleNotificationPress`; human
// strings are not required there.

// Device-approval banners are also content-free for the same reason:
// the approval flow proves which device wants in via the matching
// 4-character code displayed inside the app, not via anything the OS
// might log. We just need the visible banner to nudge the user to
// open the app and look at the approval screen.
const DEVICE_APPROVAL_TITLE = "Vex";
const DEVICE_APPROVAL_BODY = "New device sign-in request";

// Resilience caps for the notification pipeline. When the
// foreground-service has been pulling messages while the screen was
// off and the device wakes, we may have a small burst of new mail to
// announce. Each `scheduleNotificationAsync` is a binder roundtrip to
// NotificationManagerService and competes for the JS thread; firing
// dozens in parallel is what an Android ANR looks like in slow motion.
//
// Drain cap = ceiling on visible banners per drain (anything beyond
// this is silently dropped from the queue — the user already has
// unread state in-app to discover them).
// Queue cap = hard ceiling on the queue's length itself, drop-oldest
// when exceeded. Belt-and-suspenders on top of the drain cap: if the
// drain ever stalls (a hung binder call, a runaway producer), the
// queue still can't grow without bound and starve memory. The chosen
// value is large enough that a normal wake-from-sleep backlog never
// touches it.
// Yield = ms to release the event loop between scheduling calls so
// the JS thread can service Fabric sync calls / pings / UI work.
const NOTIFICATION_DRAIN_CAP = 6;
const NOTIFICATION_QUEUE_CAP = 50;
const NOTIFICATION_DRAIN_YIELD_MS = 25;

let channelReady = false;
let deviceApprovalChannelReady = false;
const notificationQueue: Message[] = [];
let notificationDrainInFlight = false;
// Per-process dedupe so we never fire the same OS banner twice for the
// same requestID. App.tsx already tracks "seen" request IDs at the toast
// layer, but if the watcher re-runs (resume, refresh) it can call us
// again for the same ID; we'd rather drop the duplicate than spam.
const notifiedApprovalRequestIDs = new Set<string>();

type PendingRouteTap = { data: Record<string, unknown>; dedupeKey?: string };

const pendingRouteTapQueue: PendingRouteTap[] = [];

// Show banner + play sound when a notification arrives while the app is open.
Notifications.setNotificationHandler({
    handleNotification: () =>
        Promise.resolve({
            shouldPlaySound: true,
            shouldSetBadge: false,
            shouldShowBanner: true,
            shouldShowList: true,
        }),
});

/**
 * Lets App.tsx forget previously-notified request IDs. Called on
 * sign-out / user switch so a returning user doesn't carry the
 * previous account's dedupe set into their session.
 */
export function clearNotifiedApprovalRequestIDs(): void {
    notifiedApprovalRequestIDs.clear();
}

/**
 * Dismisses the OS banner posted for `requestID`, if any. Called when
 * the watcher observes that a previously-pending request has moved to
 * approved / rejected / expired so the user doesn't keep seeing a
 * banner for something they've already handled.
 */
export async function dismissDeviceApprovalNotification(
    requestID: string,
): Promise<void> {
    notifiedApprovalRequestIDs.delete(requestID);
    try {
        await Notifications.dismissNotificationAsync(
            deviceApprovalNotificationID(requestID),
        );
    } catch {
        // Best-effort; the banner may have already been dismissed by
        // the user, or never posted (e.g. iOS background).
    }
}

/**
 * Queued from `notifee.onBackgroundEvent` in `index.js` (Android) when the user
 * taps a message notification while the JS engine is not yet interactive.
 */
export function enqueueNotificationRouteFromAndroidBackground(data: {
    [key: string]: number | object | string;
}): void {
    const kind = data["kind"];
    if (kind !== "dm" && kind !== "group") {
        return;
    }
    const normalized = normalizeAndroidMessageRouteData(data);
    const dedupeKey =
        typeof data["mailID"] === "string" ? data["mailID"] : undefined;
    if (dedupeKey) {
        const idx = pendingRouteTapQueue.findIndex(
            (p) => p.dedupeKey === dedupeKey,
        );
        if (idx >= 0) {
            pendingRouteTapQueue.splice(idx, 1);
        }
    }
    if (dedupeKey !== undefined) {
        pendingRouteTapQueue.push({ data: normalized, dedupeKey });
    } else {
        pendingRouteTapQueue.push({ data: normalized });
    }
}

/**
 * Called from `NavigationContainer` `onReady` so cold-start / background taps
 * that arrived before the navigator mounted are replayed once.
 */
export function flushPendingNotificationRoutes(): void {
    while (navigationRef.isReady() && pendingRouteTapQueue.length > 0) {
        const next = pendingRouteTapQueue.shift();
        if (next) {
            handleNotificationPress(next.data);
        }
    }
}

export async function requestNotificationPermission(): Promise<boolean> {
    const settings = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return (
        settings.granted ||
        settings.ios?.status === IosAuthorizationStatus.PROVISIONAL
    );
}

export function setupNotificationHandlers(): () => void {
    const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            routeNotificationTap(
                response.notification.request.content.data as Record<
                    string,
                    unknown
                >,
            );
        },
    );

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
        routeNotificationTap(
            lastResponse.notification.request.content.data as Record<
                string,
                unknown
            >,
        );
    }

    let unsubNotifee: (() => void) | undefined;
    if (Platform.OS === "android") {
        unsubNotifee = notifee.onForegroundEvent(({ detail, type }) => {
            if (type !== EventType.PRESS) {
                return;
            }
            const data = detail.notification?.data;
            if (!data || (data["kind"] !== "dm" && data["kind"] !== "group")) {
                return;
            }
            routeNotificationTap(normalizeAndroidMessageRouteData(data));
        });

        void notifee.getInitialNotification().then((initial) => {
            if (!initial) {
                return;
            }
            const data = initial.notification.data;
            if (!data || (data["kind"] !== "dm" && data["kind"] !== "group")) {
                return;
            }
            routeNotificationTap(normalizeAndroidMessageRouteData(data));
        });
    }

    queueMicrotask(() => {
        flushPendingNotificationRoutes();
    });

    return () => {
        subscription.remove();
        unsubNotifee?.();
    };
}

/**
 * Posts an OS-level banner for a fresh device-sign-in request that
 * arrived over the WebSocket. Cheap when called repeatedly for the
 * same `requestID` — we dedupe per process so a watcher refresh that
 * re-observes the same pending request won't post a second banner.
 *
 * This complements the in-app `pendingApprovalNotice` toast: the toast
 * is what the user sees if they're already in the app, the OS banner
 * is what wakes them up when they're not. Tapping either lands on the
 * same `DeviceRequests` screen where the matching 4-character code
 * lives.
 *
 * On Android, this rides on the foreground service keeping the JS
 * engine alive long enough to receive the WS event in the first
 * place; on iOS the OS will only deliver this while the app is
 * foreground (no background WebSocket), and the foreground notification
 * handler above will surface it as a heads-up banner.
 */
export async function showDeviceApprovalNotification(
    requestID: string,
): Promise<void> {
    if (notifiedApprovalRequestIDs.has(requestID)) {
        return;
    }
    notifiedApprovalRequestIDs.add(requestID);
    try {
        await ensureDeviceApprovalChannel();
        await Notifications.scheduleNotificationAsync({
            content: {
                body: DEVICE_APPROVAL_BODY,
                data: {
                    kind: "deviceApproval",
                    requestID,
                },
                title: DEVICE_APPROVAL_TITLE,
            },
            // Use the requestID itself as the OS-level identifier so we
            // can dismiss the banner cleanly once the request resolves
            // (approved / rejected / expired). Without this the banner
            // would linger in the tray after the user has already
            // dealt with it on the original device.
            identifier: deviceApprovalNotificationID(requestID),
            trigger: { channelId: DEVICE_APPROVAL_CHANNEL_ID },
        });
    } catch {
        // Non-fatal — the in-app toast is still firing in parallel
        // and will surface the request when the user opens the app.
        notifiedApprovalRequestIDs.delete(requestID);
    }
}

/**
 * Public entry point for "tell the user about this message."
 *
 * Implementation note: this looks like a single async function but
 * internally it's a queue + drain. Callers fire-and-forget many of
 * these in rapid succession (one per atom-update tick when a backlog
 * lands); the queue serializes the binder calls to
 * NotificationManagerService and yields between them so we can never
 * saturate the JS thread badly enough to ANR. Returns once *this*
 * message has been dispatched (or skipped/dropped).
 */
export async function showMessageNotification(mail: Message): Promise<void> {
    notificationQueue.push(mail);
    // Drop oldest when over the hard ceiling. We prefer to surface the
    // most recent messages to the user; older queued ones are stale by
    // the time we'd dispatch them anyway, and the unread state in-app
    // is the source of truth for "what did I miss."
    while (notificationQueue.length > NOTIFICATION_QUEUE_CAP) {
        notificationQueue.shift();
    }
    await drainNotificationQueue();
}

function deviceApprovalNotificationID(requestID: string): string {
    // Namespaced so it can never collide with a notification ID we
    // generate elsewhere in the app (currently message banners are
    // auto-IDed by expo-notifications, but a future change could add
    // explicit IDs there too).
    return `vex-device-approval:${requestID}`;
}

async function drainNotificationQueue(): Promise<void> {
    if (notificationDrainInFlight) {
        return;
    }
    notificationDrainInFlight = true;
    try {
        let dispatched = 0;
        while (notificationQueue.length > 0) {
            const mail = notificationQueue.shift();
            if (!mail) {
                continue;
            }
            if (dispatched >= NOTIFICATION_DRAIN_CAP) {
                // Soft cap. Leave the rest in-app; never let the queue
                // become a self-DOS vector during a wake-from-sleep
                // backlog. Drop silently rather than backpressure
                // upstream — the user can see the unread badges in
                // the app anyway.
                continue;
            }
            try {
                await scheduleOneMessageNotification(mail);
                dispatched += 1;
            } catch {
                // A single failed scheduleNotificationAsync must not
                // poison the queue for everything behind it.
            }
            // Yield to the event loop. Lets Fabric sync calls, server
            // pings, and any pending React render run between binder
            // calls instead of starving them.
            await sleep(NOTIFICATION_DRAIN_YIELD_MS);
        }
    } finally {
        notificationDrainInFlight = false;
    }
}

async function ensureChannel(): Promise<void> {
    if (channelReady) return;
    if (Platform.OS === "android") {
        await notifee.createChannel({
            id: CHANNEL_ID,
            importance: NotifeeAndroidImportance.HIGH,
            name: "Messages",
            sound: "default",
            vibration: true,
        });
    } else {
        await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
            importance: AndroidImportance.HIGH,
            name: "Messages",
        });
    }
    channelReady = true;
}

async function ensureDeviceApprovalChannel(): Promise<void> {
    if (deviceApprovalChannelReady) return;
    await Notifications.setNotificationChannelAsync(
        DEVICE_APPROVAL_CHANNEL_ID,
        {
            importance: AndroidImportance.HIGH,
            name: "Device requests",
        },
    );
    deviceApprovalChannelReady = true;
}

function findServerForChannel(channelID: string): string | undefined {
    const channels = $channels.get();
    for (const [serverID, serverChannels] of Object.entries(channels)) {
        if (serverChannels.some((c) => c.channelID === channelID)) {
            return serverID;
        }
    }
    return undefined;
}

function handleNotificationPress(
    data: Record<string, unknown> | undefined,
): void {
    const kind = data?.["kind"];
    const authorID = data?.["authorID"];
    const channelID = data?.["channelID"];
    const serverID = data?.["serverID"];
    if (kind === "deviceApproval") {
        // Land on the actual approve/deny applet — the matching code is
        // displayed inside that screen, and that's the only thing the
        // user has to do here.
        navigateToDeviceRequests();
        return;
    }
    if (
        kind === "group" &&
        typeof channelID === "string" &&
        typeof serverID === "string"
    ) {
        // Resolve the channel name from in-memory state at tap time rather
        // than embedding it in the notification payload (which the OS logs).
        const channels = $channels.get();
        const serverChannels = channels[serverID] ?? [];
        const channel = serverChannels.find((c) => c.channelID === channelID);
        const channelName = channel?.name ?? "channel";
        navigateToChannel(channelID, channelName, serverID);
        return;
    }
    if (typeof authorID !== "string") {
        return;
    }
    // Same rationale — resolve username at tap time. Falls back to a truncated
    // ID if the familiar isn't loaded yet (e.g. cold start before sync).
    const familiars = $familiars.get();
    const username = familiars[authorID]?.username ?? authorID.slice(0, 8);
    navigateToConversation(authorID, username);
}

/** Best-effort UTI for UNNotificationAttachment when scheduling from a remote URL. */
function iosAvatarAttachmentType(url: string): string {
    const path = (url.split("?")[0] ?? url).toLowerCase();
    if (path.endsWith(".png")) {
        return "public.png";
    }
    if (path.endsWith(".gif")) {
        return "public.gif";
    }
    if (path.endsWith(".webp")) {
        return "public.webp";
    }
    return "public.jpeg";
}

function normalizeAndroidMessageRouteData(raw: {
    [key: string]: number | object | string;
}): Record<string, unknown> {
    const kind = stringifyRouteField(raw["kind"]);
    const authorID = stringifyRouteField(raw["authorID"]);
    const out: Record<string, unknown> = { authorID, kind };
    if (raw["mailID"] != null) {
        out["mailID"] = stringifyRouteField(raw["mailID"]);
    }
    if (kind === "group") {
        out["channelID"] = stringifyRouteField(raw["channelID"]);
        out["serverID"] = stringifyRouteField(raw["serverID"]);
    }
    return out;
}

function resolveAuthorNameMobile(userID: string): string | undefined {
    return $familiars.get()[userID]?.username;
}

function resolveChannelInfoMobile(
    channelID: string,
): undefined | { channelName: string; serverName: string } {
    const serverID = findServerForChannel(channelID);
    if (!serverID) {
        return undefined;
    }
    const serverChannels = $channels.get()[serverID] ?? [];
    const channel = serverChannels.find((c) => c.channelID === channelID);
    const server = $servers.get()[serverID];
    const channelName = channel?.name ?? "channel";
    const serverName = server?.name ?? serverID.slice(0, 8);
    return { channelName, serverName };
}

function routeNotificationTap(data: Record<string, unknown> | undefined): void {
    if (!data || typeof data !== "object") {
        return;
    }
    if (navigationRef.isReady()) {
        handleNotificationPress(data);
        return;
    }
    const dedupeKey =
        typeof data["mailID"] === "string" ? data["mailID"] : undefined;
    if (dedupeKey) {
        const dup = pendingRouteTapQueue.findIndex(
            (p) => p.dedupeKey === dedupeKey,
        );
        if (dup >= 0) {
            pendingRouteTapQueue.splice(dup, 1);
        }
    }
    if (dedupeKey !== undefined) {
        pendingRouteTapQueue.push({ data, dedupeKey });
    } else {
        pendingRouteTapQueue.push({ data });
    }
}

async function scheduleOneMessageNotification(mail: Message): Promise<void> {
    const payload = shouldNotify(
        mail,
        (uid) => resolveAuthorNameMobile(uid),
        mail.group ? (cid) => resolveChannelInfoMobile(cid) : undefined,
    );
    if (!payload) return;

    const serverID = mail.group ? findServerForChannel(mail.group) : undefined;

    await ensureChannel();

    const avatarUrl = buildAvatarUrl(
        payload.authorID,
        $avatarVersions.get()[payload.authorID],
    );

    const routeData: Record<string, string> = {
        authorID: payload.authorID,
        kind: payload.group ? "group" : "dm",
        mailID: payload.mailID,
    };
    if (payload.group && serverID) {
        routeData["channelID"] = payload.group;
        routeData["serverID"] = serverID;
    }

    if (Platform.OS === "android") {
        await notifee.displayNotification({
            android: {
                category: AndroidCategory.MESSAGE,
                channelId: CHANNEL_ID,
                pressAction: { id: "default" },
                smallIcon: "notification_icon",
                ...(avatarUrl != null
                    ? { circularLargeIcon: true, largeIcon: avatarUrl }
                    : {}),
                style: {
                    group: true,
                    messages: [
                        {
                            person: {
                                ...(avatarUrl != null
                                    ? { icon: avatarUrl }
                                    : {}),
                                id: payload.authorID,
                                name: payload.title,
                            },
                            text: payload.body,
                            timestamp: Date.now(),
                        },
                    ],
                    person: { id: "self", name: "You" },
                    title: payload.subtitle,
                    type: AndroidStyle.MESSAGING,
                },
            },
            body: `${payload.title}: ${payload.body}`,
            data: routeData,
            id: payload.mailID,
            title: payload.subtitle,
        });
        return;
    }

    const iosAvatar =
        avatarUrl != null
            ? [
                  {
                      identifier: "vex-sender-avatar",
                      type: iosAvatarAttachmentType(avatarUrl),
                      url: avatarUrl,
                  },
              ]
            : null;

    await Notifications.scheduleNotificationAsync({
        content: {
            body: `${payload.title}: ${payload.body}`,
            data: {
                authorID: payload.authorID,
                channelID: payload.group ?? undefined,
                kind: payload.group ? "group" : "dm",
                serverID,
            },
            title: payload.subtitle,
            ...(iosAvatar != null ? { attachments: iosAvatar } : {}),
        },
        trigger: { channelId: CHANNEL_ID },
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function stringifyRouteField(value: unknown): string {
    if (typeof value === "string") {
        return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
        return String(value);
    }
    if (typeof value === "boolean") {
        return String(value);
    }
    return "";
}
