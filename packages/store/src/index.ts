// Client singleton
export { $client } from './client.ts'

// Bootstrap + key-replaced flag
export { bootstrap, $keyReplaced } from './bootstrap.ts'
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

// Notification decisions
export { shouldNotify } from './notifications.ts'
export type { NotificationPayload } from './notifications.ts'

// Unread counts
export { $unreadCounts, $totalUnread, incrementUnread, markRead, resetAllUnread } from './unread.ts'

// Message utilities
export {
  chunkMessages,
  parseFileExtra,
  isImageType,
  formatFileSize,
  applyEmoji,
  formatTime,
} from './message-utils.ts'
export type { MessageChunk, FileAttachment } from './message-utils.ts'

// Reset
export { resetAll } from './reset.ts'
