import type { Message } from "@vex-chat/libvex";

import { $groupMessages, $messages, shouldNotify } from "@vex-chat/store";

import { getCurrentWindow } from "@tauri-apps/api/window";
import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from "@tauri-apps/plugin-notification";

import { playNotify } from "./sounds.js";

// ── Preference ──────────────────────────────────────────────────────────────

const NOTIF_KEY = "vex-notifications-enabled";

export function getNotificationsEnabled(): boolean {
    return localStorage.getItem(NOTIF_KEY) !== "false";
}

export function setNotificationsEnabled(enabled: boolean): void {
    localStorage.setItem(NOTIF_KEY, String(enabled));
}

// ── Atom-based notification watcher ─────────────────────────────────────────

/**
 * Subscribes to message atoms and fires desktop notifications for new messages.
 * Returns an unsubscribe function.
 */
export function setupNotifications(
    resolveAuthorName?: (userID: string) => string | undefined,
    resolveChannelInfo?: (
        channelID: string,
    ) => undefined | { channelName: string; serverName: string },
): () => void {
    let prevDmSnapshot = $messages.get();
    let prevGroupSnapshot = $groupMessages.get();

    const handleNewMessage = async (msg: Message): Promise<void> => {
        let focused = false;
        try {
            focused = await getCurrentWindow().isFocused();
        } catch {}

        const payload = shouldNotify(
            msg,
            resolveAuthorName,
            resolveChannelInfo,
        );
        if (!payload) return;
        if (!getNotificationsEnabled()) return;

        playNotify();

        if (!focused) {
            const granted = await ensurePermission();
            if (granted) {
                const body =
                    payload.subtitle != null && payload.subtitle.length > 0
                        ? `${payload.subtitle}\n\n${payload.body}`
                        : payload.body;
                sendNotification({ body, title: payload.title });
            }
        }
    };

    const unsubDm = $messages.subscribe((next) => {
        for (const [threadKey, msgs] of Object.entries(next)) {
            const prev = prevDmSnapshot[threadKey] ?? [];
            if (msgs.length > prev.length) {
                const newMsg = msgs[msgs.length - 1];
                if (newMsg) void handleNewMessage(newMsg);
            }
        }
        prevDmSnapshot = next;
    });

    const unsubGroup = $groupMessages.subscribe((next) => {
        for (const [channelID, msgs] of Object.entries(next)) {
            const prev = prevGroupSnapshot[channelID] ?? [];
            if (msgs.length > prev.length) {
                const newMsg = msgs[msgs.length - 1];
                if (newMsg) void handleNewMessage(newMsg);
            }
        }
        prevGroupSnapshot = next;
    });

    return () => {
        unsubDm();
        unsubGroup();
    };
}

// ── Permission ──────────────────────────────────────────────────────────────

async function ensurePermission(): Promise<boolean> {
    try {
        let granted = await isPermissionGranted();
        if (!granted) {
            const result = await requestPermission();
            granted = result === "granted";
        }
        return granted;
    } catch {
        return false;
    }
}
