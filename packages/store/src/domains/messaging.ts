import type { Message } from "@vex-chat/libvex";

import { computed, map, readonlyType } from "nanostores";

// ── Writable (internal — only VexService imports these) ─────────────────────

export const $messagesWritable = map<Record<string, Message[]>>({});
export const $groupMessagesWritable = map<Record<string, Message[]>>({});
export const $dmUnreadCountsWritable = map<Record<string, number>>({});
export const $channelUnreadCountsWritable = map<Record<string, number>>({});

// ── Readable (public — components subscribe to these) ───────────────────────

export const $messages = readonlyType($messagesWritable);
export const $groupMessages = readonlyType($groupMessagesWritable);
export const $dmUnreadCounts = readonlyType($dmUnreadCountsWritable);
export const $channelUnreadCounts = readonlyType($channelUnreadCountsWritable);

// ── Computed (public) ───────────────────────────────────────────────────────

export const $totalDmUnread = computed($dmUnreadCountsWritable, (counts) =>
    Object.values(counts).reduce((sum, n) => sum + n, 0),
);

export const $totalChannelUnread = computed(
    $channelUnreadCountsWritable,
    (counts) => Object.values(counts).reduce((sum, n) => sum + n, 0),
);
