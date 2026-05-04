import type { Message } from "@vex-chat/libvex";

import { shouldNotify } from "@vex-chat/store";
import { $channels, $familiars } from "@vex-chat/store";

import * as Notifications from "expo-notifications";
import { AndroidImportance, IosAuthorizationStatus } from "expo-notifications";

import {
    navigateToChannel,
    navigateToConversation,
    navigateToDeviceRequests,
} from "../navigation/navigationRef";

const CHANNEL_ID = "vex-messages";
// Separate channel so users can mute messages but keep account-security
// notifications loud (or vice versa) from system Settings → Notifications.
// Device-approval requests are time-bounded (the request expires on a
// short TTL) and security-relevant, so they get HIGH importance with a
// default sound regardless of the messages channel preference.
const DEVICE_APPROVAL_CHANNEL_ID = "vex-device-approval";

// We deliberately never hand the OS the decrypted message body or the sender's
// name. Both platforms persist notification content far past the visible
// banner, in surfaces that survive E2EE:
//
//   - Android: NotificationManagerService writes every posted/updated/cancelled
//     notification (title + content text) to logcat. logcat is readable by any
//     process holding READ_LOGS, captured verbatim in bug reports, and on
//     userdebug builds it lands in dmesg-adjacent kernel-side ring buffers.
//
//   - iOS: APNS payloads and posted notifications are persisted in the
//     UserNotifications store and surfaced through the unified logging system.
//     Forensic extraction tools (Cellebrite, GrayKey) routinely pull
//     notification content off seized devices via sysdiagnose / the
//     CoreDuet/Biome stores. This is the path that has been used to recover
//     Signal messages from locked iPhones.
//
// The visible banner therefore carries only a fixed string. Routing data
// (authorID, channelID, etc.) rides in the `data` field, which the OS does not
// log to either of those surfaces and which we read back in
// `handleNotificationPress` to route the tap.
const GENERIC_TITLE = "Vex";
const GENERIC_BODY = "New message";

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
    // Single listener covers foreground, background, and cold-start taps.
    const subscription = Notifications.addNotificationResponseReceivedListener(
        (response) => {
            handleNotificationPress(response.notification.request.content.data);
        },
    );

    // If the app was launched by tapping a notification, replay it.
    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
        handleNotificationPress(lastResponse.notification.request.content.data);
    }

    return () => {
        subscription.remove();
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
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
        importance: AndroidImportance.HIGH,
        name: "Messages",
    });
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

async function scheduleOneMessageNotification(mail: Message): Promise<void> {
    // We pass `shouldNotify` no resolver callbacks: it's still useful for the
    // "should we notify at all?" gating (suppresses self-messages and the
    // logged-out case), but the title/body it builds would only be discarded.
    // Skipping the resolvers also avoids what was previously a `lookupUser`
    // network roundtrip per incoming notifiable message — itself a metadata
    // leak ("user X just got a message from Y") that we have no need to emit
    // now that the banner doesn't display the name.
    const payload = shouldNotify(mail);
    if (!payload) return;

    // For group messages we still need the owning serverID so the tap handler
    // can navigate to the right server context. The channel-name string is
    // *not* read here — it's resolved at tap time, not stored in `data`.
    const serverID = mail.group ? findServerForChannel(mail.group) : undefined;

    await ensureChannel();

    // Routing data is intentionally limited to opaque IDs. The OS persists
    // userInfo/extras alongside the visible content (see comment at top of
    // file), so we never put human-readable strings — display names, channel
    // names, message bodies — anywhere the OS can see. The tap handler
    // resolves the IDs back to names from in-memory state.
    await Notifications.scheduleNotificationAsync({
        content: {
            body: GENERIC_BODY,
            data: {
                authorID: payload.authorID,
                channelID: payload.group ?? undefined,
                kind: payload.group ? "group" : "dm",
                serverID,
            },
            title: GENERIC_TITLE,
        },
        trigger: { channelId: CHANNEL_ID },
    });
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
