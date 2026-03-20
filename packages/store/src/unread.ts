import { map, computed } from 'nanostores'

/** Unread message count per conversation key (userID for DMs, channelID for groups). */
export const $unreadCounts = map<Record<string, number>>({})

/** Total unread count across all conversations. */
export const $totalUnread = computed($unreadCounts, (counts) =>
  Object.values(counts).reduce((sum, n) => sum + n, 0)
)

export function incrementUnread(conversationKey: string): void {
  const prev = $unreadCounts.get()[conversationKey] ?? 0
  $unreadCounts.setKey(conversationKey, prev + 1)
}

export function markRead(conversationKey: string): void {
  if ($unreadCounts.get()[conversationKey]) {
    $unreadCounts.setKey(conversationKey, 0)
  }
}

export function resetAllUnread(): void {
  $unreadCounts.set({})
}
