import { Linking, Platform } from "react-native";

import notifee, { AndroidImportance } from "@notifee/react-native";
import * as SecureStore from "expo-secure-store";
import { atom } from "nanostores";

/**
 * "Always-on connection" mode keeps the libvex WebSocket alive while
 * the app is backgrounded. Implemented as an Android foreground service
 * (via `@notifee/react-native`) with a persistent low-importance
 * notification — the Android contract for "the user knows this is
 * running, don't kill it for being idle".
 *
 * iOS has no comparable surface (the OS strictly suspends backgrounded
 * apps); the toggle is hidden from iOS users at the UI layer.
 *
 * Reliability is best-effort:
 *   - Stock AOSP / Pixel / GrapheneOS: indefinite once the user grants
 *     "Unrestricted" battery access (Settings → Battery → Unrestricted).
 *   - Samsung / Xiaomi / Huawei / Oppo: per-OEM kill lists may still
 *     stop the service on a long-enough idle. See dontkillmyapp.com
 *     for per-vendor escape hatches; we link users there from the
 *     settings screen rather than encoding them in code.
 *
 * Architectural note:
 *   We deliberately do NOT relocate the WebSocket into native code.
 *   The libvex `Client` already owns ping/reconnect/dedup; the FGS's
 *   only job is to keep the JS engine alive long enough for that
 *   logic to run. The service body is therefore a Promise that never
 *   resolves — Notifee's documented pattern for "stay alive
 *   indefinitely until {@link stopAlwaysOn} is called or the OS
 *   reclaims the process."
 */

const STORE_KEY = "vex.alwaysOnConnection.v1";
const CHANNEL_ID = "vex-connection";
const FGS_NOTIFICATION_ID = "vex-connection";

/** User preference: should the foreground service run on next app launch? */
export const $alwaysOnEnabled = atom<boolean>(false);

let registered = false;
let hydrated = false;
let serviceRunning = false;

export async function hydrateAlwaysOnPreference(): Promise<void> {
    if (hydrated) {
        return;
    }
    hydrated = true;
    try {
        const raw = await SecureStore.getItemAsync(STORE_KEY);
        if (raw === "1") {
            $alwaysOnEnabled.set(true);
        }
    } catch {
        // SecureStore can throw on misconfigured devices; defaulting
        // to "off" is the safe choice — the user can flip it back on
        // from Settings if they meant to keep it.
    }
}

export function isAlwaysOnSupported(): boolean {
    return Platform.OS === "android";
}

/**
 * Opens Android's battery-optimization settings list so the user can
 * exempt the app. Without this exemption Doze will throttle network
 * access for backgrounded foreground services on most stock builds.
 *
 * Uses the system intent (`Linking.sendIntent`) rather than a new
 * Expo dependency. No-op on iOS.
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
    if (Platform.OS !== "android") {
        return;
    }
    try {
        await Linking.sendIntent(
            "android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS",
        );
    } catch {
        // Some OEM builds gate this intent; fall back to generic
        // app-settings so the user can still reach Battery from there.
        try {
            await Linking.openSettings();
        } catch {
            // ignore — best effort
        }
    }
}

export async function startAlwaysOn(): Promise<void> {
    if (!isAlwaysOnSupported()) {
        return;
    }
    ensureRegistered();

    const channelId = await notifee.createChannel({
        id: CHANNEL_ID,
        importance: AndroidImportance.LOW,
        name: "Connection",
    });

    await notifee.displayNotification({
        android: {
            asForegroundService: true,
            channelId,
            ongoing: true,
            pressAction: { id: "default" },
            smallIcon: "ic_notification",
        },
        body: "Connected",
        id: FGS_NOTIFICATION_ID,
        title: "Vex",
    });

    serviceRunning = true;
    $alwaysOnEnabled.set(true);

    try {
        await SecureStore.setItemAsync(STORE_KEY, "1");
    } catch {
        // Persistence failure is non-fatal — current session still
        // benefits from the running FGS; user just won't auto-resume
        // on next launch.
    }
}

export async function stopAlwaysOn(): Promise<void> {
    if (!isAlwaysOnSupported()) {
        return;
    }
    await suspendAlwaysOn();

    $alwaysOnEnabled.set(false);

    try {
        await SecureStore.deleteItemAsync(STORE_KEY);
    } catch {
        // ignore — the in-memory atom is the source of truth for the
        // current session.
    }
}

/**
 * Stops the running FGS without changing the persisted preference.
 * Use for transient "the user signed out" or "the network is gone"
 * scenarios where we want the connection notification gone but want
 * to honor the user's toggle on next sign-in. For an explicit user
 * toggle-off, call {@link stopAlwaysOn} instead.
 *
 * The {@link $alwaysOnEnabled} atom is intentionally left alone here:
 * it reflects the user's *preference*, not the runtime state of the
 * service. The Switch in Settings should keep showing "on" across a
 * sign-out → sign-in cycle if that's what the user chose.
 */
export async function suspendAlwaysOn(): Promise<void> {
    if (!isAlwaysOnSupported() || !serviceRunning) {
        return;
    }
    try {
        await notifee.stopForegroundService();
    } catch {
        // Notifee may throw if the service isn't actually running
        // (e.g., killed by the OS already). Either way we want the
        // notification gone.
    }
    try {
        await notifee.cancelNotification(FGS_NOTIFICATION_ID);
    } catch {
        // ignore
    }
    serviceRunning = false;
}

/**
 * Idempotently registers the FGS body. Safe to call repeatedly; only
 * the first invocation has effect. Notifee requires the runner to be
 * registered before {@link startAlwaysOn} can attach a notification
 * to it.
 */
function ensureRegistered(): void {
    if (registered) {
        return;
    }
    registered = true;
    notifee.registerForegroundService(() => {
        return new Promise(() => {
            // Intentionally never resolves. Notifee tears the service
            // down via `stopForegroundService()`, which abandons this
            // Promise — fine for GC. If the OS kills the process the
            // whole JS context goes with it.
        });
    });
}
