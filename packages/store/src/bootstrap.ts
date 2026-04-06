import { Client } from '@vex-chat/libvex'
import type { IMessage, IClientOptions, IStorage, PlatformPreset } from '@vex-chat/libvex'
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
 * Initialises the Client, wires real-time events, connects to the server,
 * then runs the bootstrap waterfall to populate initial state.
 *
 * @param privateKey   - Hex-encoded Ed25519 secret key for the device
 * @param preset       - Platform preset (adapters + storage factory). Use:
 *                       `nodePreset()`, `expoPreset()`, `tauriPreset()`, or `testPreset()`
 * @param options      - Client options (host, logLevel, etc.)
 */
export async function bootstrap(
  privateKey: string,
  preset: PlatformPreset,
  options?: { host?: string; unsafeHttp?: boolean; logLevel?: string; inMemoryDb?: boolean },
): Promise<void> {
  // Clear stale state from any previous session
  resetAll()

  const storage = await preset.createStorage('vex-client.db', privateKey, preset.adapters.logger)
  const client = await Client.create(privateKey, { ...options, adapters: preset.adapters } as any, storage)
  $client.set(client)

  // Wire real-time events before connecting so nothing is missed
  client.on('message', (msg: IMessage) => {
    preset.adapters.logger.debug('[vex-store] message: ' + msg.mailID + ' from: ' + msg.authorID)
    const me = $user.get()
    if (msg.group) {
      // Group / channel message — key by channelID, deduplicate by mailID
      const prev = $groupMessages.get()[msg.group] ?? []
      if (!prev.some(m => m.mailID === msg.mailID)) {
        $groupMessages.setKey(msg.group, [...prev, msg])
        // Messages persist via IStorage (SQLite) — no manual save needed
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
        // Messages persist via IStorage (SQLite) — no manual save needed
      } else if (!prev.some(m => m.mailID === msg.mailID)) {
        $messages.setKey(threadKey, [...prev, msg])
        // Messages persist via IStorage (SQLite) — no manual save needed

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

  // Messages load from IStorage (SQLite) via Client internally.
  // The 'message' event fires for each decrypted message (inbox + real-time).
}
