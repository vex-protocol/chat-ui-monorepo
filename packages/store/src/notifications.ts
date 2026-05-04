import type { Message } from "@vex-chat/libvex";

import { $user } from "./domains/identity.ts";

export interface NotificationPayload {
    authorID: string;
    body: string;
    conversationKey: string;
    /** Set for group messages — the channelID. */
    group: null | string;
    mailID: string;
    /**
     * Group chats only — a short line for OS subtitle / second line
     * (e.g. 「Server」 · #channel). Null for DMs.
     */
    subtitle: null | string;
    /** Display name of the sender (notification title on most platforms). */
    title: string;
}

/** Stylized server + channel line for group notification subtitles. */
export function formatGroupNotificationSubtitle(
    serverName: string,
    channelName: string,
): string {
    const raw = channelName.trim();
    const ch = raw.startsWith("#") ? raw : `#${raw}`;
    return `「${serverName}」 · ${ch}`;
}

/**
 * Determines whether a received message should trigger a notification.
 * Returns a payload if yes, null if no.
 *
 * Platform apps handle the actual notification display:
 *   - Desktop: Tauri sendNotification + playNotify sound
 *   - Mobile: Notifee displayNotification
 *
 * @param msg                 - The incoming message
 * @param resolveAuthorName   - Optional lookup from userID to display name
 * @param resolveChannelInfo  - Optional lookup from channelID to channel + server display names
 */
export function shouldNotify(
    msg: Message,
    resolveAuthorName?: (userID: string) => string | undefined,
    resolveChannelInfo?: (
        channelID: string,
    ) => undefined | { channelName: string; serverName: string },
): NotificationPayload | null {
    const me = $user.get();
    if (!me) return null;
    if (msg.authorID === me.userID) return null;

    const conversationKey = msg.group ?? msg.authorID;

    const authorName =
        resolveAuthorName?.(msg.authorID) ?? msg.authorID.slice(0, 8);

    const title = authorName;

    let subtitle: null | string = null;
    if (msg.group) {
        const info = resolveChannelInfo?.(msg.group);
        subtitle = info
            ? formatGroupNotificationSubtitle(info.serverName, info.channelName)
            : "Group chat";
    }

    const body =
        msg.message.length > 100
            ? msg.message.slice(0, 97) + "..."
            : msg.message;

    return {
        authorID: msg.authorID,
        body,
        conversationKey,
        group: msg.group,
        mailID: msg.mailID,
        subtitle,
        title,
    };
}
