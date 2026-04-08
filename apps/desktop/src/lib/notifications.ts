import {
    isPermissionGranted,
    requestPermission,
    sendNotification,
} from "@tauri-apps/plugin-notification";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { IMessage } from "@vex-chat/libvex";
import { shouldNotify } from "@vex-chat/store";
import { playNotify } from "./sounds.js";

/** Minimal interface needed to subscribe/unsubscribe to mail events. */
interface MailEventEmitter {
    on(event: "mail", handler: (mail: IMessage) => void): void;
    off(event: "mail", handler: (mail: IMessage) => void): void;
    getUser(userID: string): Promise<{ username: string } | null>;
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

// ── Wire up to Client ────────────────────────────────────────────────────────

/**
 * Attaches a mail listener that fires desktop notifications using the shared
 * shouldNotify() decision logic. Returns an unsubscribe function.
 */
export function setupNotifications(
    client: MailEventEmitter,
    activeConversation: () => string | null,
    resolveAuthorName?: (userID: string) => string | undefined,
    resolveChannelInfo?: (
        channelID: string,
    ) => { channelName: string; serverName: string } | undefined,
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
        if (!knownName || knownName === mail.authorID.slice(0, 8)) {
            try {
                const user = await client.getUser(mail.authorID);
                if (user) {
                    const name = user.username;
                    if (mail.group) {
                        const info = resolveChannelInfo?.(mail.group);
                        payload.title = info
                            ? `${name} (#${info.channelName}, ${info.serverName})`
                            : `${name} (#channel)`;
                    } else {
                        payload.title = name;
                    }
                }
            } catch {}
        }

        playNotify();

        if (!focused) {
            const granted = await ensurePermission();
            if (granted) {
                sendNotification({ title: payload.title, body: payload.body });
            }
        }
    };

    client.on("mail", handler);
    return () => {
        client.off("mail", handler);
    };
}
