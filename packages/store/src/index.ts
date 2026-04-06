// Client singleton
export { $client } from './client.ts'

// Bootstrap + key-replaced flag
export { bootstrap } from './bootstrap.ts'
export { $keyReplaced } from './key-replaced.ts'
export type { PersistenceCallbacks } from './bootstrap.ts'

// Auto-login
export { autoLogin } from './auto-login.ts'
export type { AutoLoginResult } from './auto-login.ts'

// State atoms
export { $user } from './user.ts'
export { $familiars } from './familiars.ts'
export { $messages, $groupMessages } from './messages.ts'
export { $servers } from './servers.ts'
export { $channels } from './channels.ts'
export { $permissions } from './permissions.ts'
export { $devices } from './devices.ts'
export { $onlineLists } from './onlineLists.ts'
export { $avatarHash } from './avatarHash.ts'
export { $verifiedKeys, markVerified, unmarkVerified, isVerified } from './verifiedKeys.ts'

// Send DM
export { sendDirectMessage, SENT_PREFIX } from './send-dm.ts'
export type { SendDMOptions, SendDMResult } from './send-dm.ts'

// Send group message
export { sendGroupMessage } from './send-group-message.ts'
export type { SendGroupMessageOptions, SendGroupMessageResult } from './send-group-message.ts'

// Notification decisions
export { shouldNotify } from './notifications.ts'
export type { NotificationPayload } from './notifications.ts'

// Unread counts
export {
  $dmUnreadCounts, $channelUnreadCounts,
  $totalDmUnread, $totalChannelUnread,
  incrementDmUnread, incrementChannelUnread,
  markRead, resetAllUnread,
} from './unread.ts'

// Message utilities
export {
  avatarHue,
  chunkMessages,
  parseFileExtra,
  isImageType,
  formatFileSize,
  applyEmoji,
  formatTime,
} from './message-utils.ts'
export type { MessageChunk, FileAttachment } from './message-utils.ts'

// Deep link parsing
export { parseVexLink, parseInviteID } from './deeplink.ts'
export type { VexLink } from './deeplink.ts'

// Reset
export { resetAll } from './reset.ts'
