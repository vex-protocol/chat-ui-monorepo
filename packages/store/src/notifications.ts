import type { DecryptedMail } from '@vex-chat/types'
import { $user } from './user.ts'

export interface NotificationPayload {
  title: string
  body: string
  conversationKey: string
  mailID: string
  authorID: string
  /** Set for group messages — the channelID. */
  group: string | null
}

/**
 * Determines whether a received message should trigger a notification.
 * Returns a payload if yes, null if no.
 *
 * Platform apps handle the actual notification display:
 *   - Desktop: Tauri sendNotification + playNotify sound
 *   - Mobile: Notifee displayNotification
 *
 * @param mail                - The incoming message
 * @param activeConversation  - The conversation key the user is currently viewing (null if none)
 * @param appFocused          - Whether the app window/screen is in the foreground
 * @param resolveAuthorName   - Optional lookup from userID to display name
 * @param resolveChannelName  - Optional lookup from channelID to "#channel, server" string
 */
export function shouldNotify(
  mail: DecryptedMail,
  activeConversation: string | null,
  appFocused: boolean,
  resolveAuthorName?: (userID: string) => string | undefined,
  resolveChannelInfo?: (channelID: string) => { channelName: string; serverName: string } | undefined,
): NotificationPayload | null {
  const me = $user.get()
  if (!me) return null
  if (mail.authorID === me.userID) return null
  if (mail.mailType === 'system') return null

  const conversationKey = mail.group ?? mail.authorID
  if (appFocused && activeConversation === conversationKey) return null

  const authorName = resolveAuthorName?.(mail.authorID) ?? mail.authorID.slice(0, 8)

  let title: string
  if (mail.group) {
    const info = resolveChannelInfo?.(mail.group)
    title = info
      ? `${authorName} (#${info.channelName}, ${info.serverName})`
      : `${authorName} (#channel)`
  } else {
    title = authorName
  }

  const body = mail.content.length > 100
    ? mail.content.slice(0, 97) + '...'
    : mail.content

  return { title, body, conversationKey, mailID: mail.mailID, authorID: mail.authorID, group: mail.group }
}
