import type { IMessage } from "@vex-chat/libvex";

import { shouldNotify } from "@vex-chat/store";

import { getCurrentWindow } from "@tauri-apps/api/window";
import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from "@tauri-apps/plugin-notification";

import { playNotify } from "./sounds.js";

/** Minimal interface needed to subscribe/unsubscribe to message events. */
interface MailEventEmitter {
    off(event: "message", handler: (mail: IMessage) => void): void;
    on(event: "message", handler: (mail: IMessage) => void): void;
}

// ── Preference ────────────────────────────────────────────────────────────────

const NOTIF_KEY = "vex-notifications-enabled";

export function getNotificationsEnabled(): boolean {
    return localStorage.getItem(NOTIF_KEY) !== "false";
}

export function setNotificationsEnabled(enabled: boolean): void {
    localStorage.setItem(NOTIF_KEY, String(enabled));
}

// ── Permission ────────────────────────────────────────────────────────────────

/**
 * Attaches a mail listener that fires desktop notifications using the shared
 * shouldNotify() decision logic. Returns an unsubscribe function.
 */
export function setupNotifications(
    client: MailEventEmitter,
    activeConversation: () => null | string,
    resolveAuthorName?: (userID: string) => string | undefined,
    resolveChannelInfo?: (
        channelID: string,
    ) => undefined | { channelName: string; serverName: string },
): () => void {
    const handler = async (mail: IMessage): Promise<void> => {
        let focused = false;
        try {
            focused = await getCurrentWindow().isFocused();
        } catch {}

        const payload = shouldNotify(
            mail,
            activeConversation(),
            focused,
            resolveAuthorName,
            resolveChannelInfo,
        );
        if (!payload) return;

        if (!getNotificationsEnabled()) return;

        // If author name wasn't resolved (or is just a truncated UUID), fetch from server
        const knownName = resolveAuthorName?.(mail.authorID);
        // TODO: user lookup for notification title — needs a lookup callback or
        // the MailEventEmitter interface needs a users.retrieve method
        void knownName;

        playNotify();

        if (!focused) {
            const granted = await ensurePermission();
            if (granted) {
                sendNotification({ body: payload.body, title: payload.title });
            }
        }
    };

    client.on("message", handler);
    return () => {
        client.off("message", handler);
    };
}

// ── Wire up to Client ────────────────────────────────────────────────────────

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
