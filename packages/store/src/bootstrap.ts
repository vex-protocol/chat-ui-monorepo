import { Client } from '@vex-chat/libvex'
import type { IMessage } from '@vex-chat/libvex'
import { $client } from './client.ts'
import { $user } from './user.ts'
import { $messages, $groupMessages } from './messages.ts'
import { $servers } from './servers.ts'
import { $channels } from './channels.ts'
import { $permissions } from './permissions.ts'
import { resetAll } from './reset.ts'
import { incrementDmUnread, incrementChannelUnread } from './unread.ts'
import { $familiars } from './familiars.ts'
import { SENT_PREFIX } from './send-dm.ts'

/**
 * Optional persistence callbacks — platform-specific (IndexedDB on desktop, AsyncStorage on mobile).
 * Passed into bootstrap() so the store package stays platform-agnostic.
 */
export interface PersistenceCallbacks {
  /** Load previously persisted messages from local storage. */
  loadMessages: () => Promise<{ dms: Record<string, IMessage[]>; groups: Record<string, IMessage[]> }>
  /** Persist the current message state to local storage. */
  saveGroupMessages: (groups: Record<string, IMessage[]>) => Promise<void>
  saveDmMessages: (dms: Record<string, IMessage[]>) => Promise<void>
}

/**
 * Initialises the Client, wires real-time events, connects to the server,
 * then runs the bootstrap waterfall to populate initial state.
 *
 * @param privateKey   - Hex-encoded Ed25519 secret key for the device
 * @param options      - Client options (host, logLevel, adapters, etc.)
 * @param persistence  - Optional platform-specific persistence callbacks
 */
export async function bootstrap(
  privateKey: string,
  options: {
    host?: string
    unsafeHttp?: boolean
    inMemoryDb?: boolean
    logLevel?: string
  },
  persistence?: PersistenceCallbacks,
): Promise<void> {
  // Clear stale state from any previous session
  resetAll()

  const client = await Client.create(privateKey, options as any)
  $client.set(client)

  // Wire real-time events before connecting so nothing is missed
  client.on('message', (msg: IMessage) => {
    console.log('[vex-store] message received:', msg.mailID, 'from:', msg.authorID, 'group:', msg.group)
    const me = $user.get()
    if (msg.group) {
      // Group / channel message — key by channelID, deduplicate by mailID
      const prev = $groupMessages.get()[msg.group] ?? []
      if (!prev.some(m => m.mailID === msg.mailID)) {
        $groupMessages.setKey(msg.group, [...prev, msg])
        persistence?.saveGroupMessages($groupMessages.get()).catch(() => {})
        if (me && msg.authorID !== me.userID) incrementChannelUnread(msg.group)
      }
    } else {
      // Direct message — key by the other party's userID, deduplicate
      const isOwnMessage = me && msg.authorID === me.userID
      const threadKey = isOwnMessage ? msg.readerID : msg.authorID
      const prev = $messages.get()[threadKey] ?? []

      const localIdx = isOwnMessage
        ? prev.findIndex(m => m.mailID.startsWith(SENT_PREFIX) && m.message === msg.message && m.authorID === msg.authorID)
        : -1

      if (localIdx !== -1) {
        const updated = [...prev]
        updated[localIdx] = msg
        $messages.setKey(threadKey, updated)
        persistence?.saveDmMessages($messages.get()).catch(() => {})
      } else if (!prev.some(m => m.mailID === msg.mailID)) {
        $messages.setKey(threadKey, [...prev, msg])
        persistence?.saveDmMessages($messages.get()).catch(() => {})

        if (!isOwnMessage) {
          incrementDmUnread(threadKey)
        }

        // Auto-add the other party as familiar
        const otherUserID = threadKey
        if (!$familiars.get()[otherUserID]) {
          $familiars.setKey(otherUserID, {
            userID: otherUserID,
            username: otherUserID.slice(0, 8),
            lastSeen: new Date(),
          })
          client.users.retrieve(otherUserID).then(([u]) => {
            if (u) $familiars.setKey(otherUserID, u)
          }).catch(() => {})
        }
      }
    }
  })

  // 4. Load locally persisted messages (instant — no network required).
  if (persistence) {
    try {
      const saved = await persistence.loadMessages()
      for (const [key, msgs] of Object.entries(saved.groups)) {
        $groupMessages.setKey(key, msgs)
      }
      for (const [key, msgs] of Object.entries(saved.dms)) {
        $messages.setKey(key, msgs)
      }
    } catch {
      // Non-fatal — messages just won't be pre-populated
    }
  }

  // Client.connect() handles login, inbox fetch, and mail decryption internally.
  // The 'message' event fires for each decrypted message (inbox + real-time).
}
