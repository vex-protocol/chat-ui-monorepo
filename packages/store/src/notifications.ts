import type { Message } from "@vex-chat/libvex";

import { $user } from "./domains/identity.ts";

export interface NotificationPayload {
    authorID: string;
    body: string;
    conversationKey: string;
    /** Set for group messages — the channelID. */
    group: null | string;
    mailID: string;
    title: string;
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
 * @param activeConversation  - The conversation key the user is currently viewing (null if none)
 * @param appFocused          - Whether the app window/screen is in the foreground
 * @param resolveAuthorName   - Optional lookup from userID to display name
 * @param resolveChannelName  - Optional lookup from channelID to "#channel, server" string
 */
export function shouldNotify(
    msg: Message,
    activeConversation: null | string,
    appFocused: boolean,
    resolveAuthorName?: (userID: string) => string | undefined,
    resolveChannelInfo?: (
        channelID: string,
    ) => undefined | { channelName: string; serverName: string },
): NotificationPayload | null {
    const me = $user.get();
    if (!me) return null;
    if (msg.authorID === me.userID) return null;

    const conversationKey = msg.group ?? msg.authorID;
    if (appFocused && activeConversation === conversationKey) return null;

    const authorName =
        resolveAuthorName?.(msg.authorID) ?? msg.authorID.slice(0, 8);

    let title: string;
    if (msg.group) {
        const info = resolveChannelInfo?.(msg.group);
        title = info
            ? `${authorName} (#${info.channelName}, ${info.serverName})`
            : `${authorName} (#channel)`;
    } else {
        title = authorName;
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
        title,
    };
}
