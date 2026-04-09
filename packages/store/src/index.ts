export { $avatarHash } from "./avatarHash.ts";

// Auth flows (register, login, auto-login — each creates Client + wires events + connects)
export {
    autoLogin,
    loginAndBootstrap,
    registerAndBootstrap,
} from "./bootstrap.ts";
export type { AuthResult, ServerOptions } from "./bootstrap.ts";
export { $channels } from "./channels.ts";

// Client singleton
export { $client } from "./client.ts";
// Deep link parsing
export { parseInviteID, parseVexLink } from "./deeplink.ts";
export type { VexLink } from "./deeplink.ts";
export { $devices } from "./devices.ts";
export { $familiars } from "./familiars.ts";
export { $keyReplaced } from "./key-replaced.ts";
// Message utilities
export {
    applyEmoji,
    avatarHue,
    chunkMessages,
    formatFileSize,
    formatTime,
    isImageType,
    parseFileExtra,
} from "./message-utils.ts";
export type { FileAttachment, MessageChunk } from "./message-utils.ts";
export { $groupMessages, $messages } from "./messages.ts";
// Notification decisions
export { shouldNotify } from "./notifications.ts";

export type { NotificationPayload } from "./notifications.ts";
export { $onlineLists } from "./onlineLists.ts";

export { $permissions } from "./permissions.ts";
// Reset
export { resetAll } from "./reset.ts";

// Send DM
export { sendDirectMessage } from "./send-dm.ts";
export type { SendDMOptions, SendDMResult } from "./send-dm.ts";

// Send group message
export { sendGroupMessage } from "./send-group-message.ts";

export type {
    SendGroupMessageOptions,
    SendGroupMessageResult,
} from "./send-group-message.ts";
export { $servers } from "./servers.ts";

// Unread counts
export {
    $channelUnreadCounts,
    $dmUnreadCounts,
    $totalChannelUnread,
    $totalDmUnread,
    incrementChannelUnread,
    incrementDmUnread,
    markRead,
    resetAllUnread,
} from "./unread.ts";
// State atoms
export { $user } from "./user.ts";

// TODO: verified keys need platform-specific secure storage (keychain/sqlite),
// not localStorage. Removed — re-implement with Storage adapter.
