import type { IMessage } from '@vex-chat/libvex'
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
 * @param msg                 - The incoming message
 * @param activeConversation  - The conversation key the user is currently viewing (null if none)
 * @param appFocused          - Whether the app window/screen is in the foreground
 * @param resolveAuthorName   - Optional lookup from userID to display name
 * @param resolveChannelName  - Optional lookup from channelID to "#channel, server" string
 */
export function shouldNotify(
  msg: IMessage,
  activeConversation: string | null,
  appFocused: boolean,
  resolveAuthorName?: (userID: string) => string | undefined,
  resolveChannelInfo?: (channelID: string) => { channelName: string; serverName: string } | undefined,
): NotificationPayload | null {
  const me = $user.get()
  if (!me) return null
  if (msg.authorID === me.userID) return null

  const conversationKey = msg.group ?? msg.authorID
  if (appFocused && activeConversation === conversationKey) return null

  const authorName = resolveAuthorName?.(msg.authorID) ?? msg.authorID.slice(0, 8)

  let title: string
  if (msg.group) {
    const info = resolveChannelInfo?.(msg.group)
    title = info
      ? `${authorName} (#${info.channelName}, ${info.serverName})`
      : `${authorName} (#channel)`
  } else {
    title = authorName
  }

  const body = msg.message.length > 100
    ? msg.message.slice(0, 97) + '...'
    : msg.message

  return { title, body, conversationKey, mailID: msg.mailID, authorID: msg.authorID, group: msg.group }
}
