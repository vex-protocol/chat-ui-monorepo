import { computed, map } from "nanostores";

/** Unread DM counts, keyed by userID. */
export const $dmUnreadCounts = map<Record<string, number>>({});

/** Unread channel counts, keyed by channelID. */
export const $channelUnreadCounts = map<Record<string, number>>({});

/** Total unread DMs. */
export const $totalDmUnread = computed($dmUnreadCounts, (counts) =>
    Object.values(counts).reduce((sum, n) => sum + n, 0),
);

/** Total unread channel messages. */
export const $totalChannelUnread = computed($channelUnreadCounts, (counts) =>
    Object.values(counts).reduce((sum, n) => sum + n, 0),
);

export function incrementChannelUnread(channelID: string): void {
    const prev = $channelUnreadCounts.get()[channelID] ?? 0;
    $channelUnreadCounts.setKey(channelID, prev + 1);
}

export function incrementDmUnread(userID: string): void {
    const prev = $dmUnreadCounts.get()[userID] ?? 0;
    $dmUnreadCounts.setKey(userID, prev + 1);
}

export function markRead(conversationKey: string): void {
    if ($dmUnreadCounts.get()[conversationKey]) {
        $dmUnreadCounts.setKey(conversationKey, 0);
    }
    if ($channelUnreadCounts.get()[conversationKey]) {
        $channelUnreadCounts.setKey(conversationKey, 0);
    }
}

export function resetAllUnread(): void {
    $dmUnreadCounts.set({});
    $channelUnreadCounts.set({});
}
