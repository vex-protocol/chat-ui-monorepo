import { atom } from 'nanostores'
import { VexClient } from '@vex-chat/libvex'
import type { DecryptedMail } from '@vex-chat/types'
import { $client } from './client.ts'
import { $user } from './user.ts'
import { $messages, $groupMessages } from './messages.ts'
import { $servers } from './servers.ts'
import { $channels } from './channels.ts'
import { $permissions } from './permissions.ts'
import { resetAll } from './reset.ts'
import { incrementUnread } from './unread.ts'

/**
 * Optional persistence callbacks — platform-specific (IndexedDB on desktop, AsyncStorage on mobile).
 * Passed into bootstrap() so the store package stays platform-agnostic.
 */
export interface PersistenceCallbacks {
  /** Load previously persisted messages from local storage. */
  loadMessages: () => Promise<{ dms: Record<string, DecryptedMail[]>; groups: Record<string, DecryptedMail[]> }>
  /** Persist the current message state to local storage. */
  saveGroupMessages: (groups: Record<string, DecryptedMail[]>) => Promise<void>
  saveDmMessages: (dms: Record<string, DecryptedMail[]>) => Promise<void>
}

/**
 * Set to true if the server returned HTTP 470 (corrupt key file).
 * The app should navigate to login and prompt the user to re-register their device.
 */
export const $keyReplaced = atom<boolean>(false)

/**
 * Initialises the VexClient, wires real-time events, connects to the server,
 * then runs the bootstrap waterfall to populate initial state from HTTP.
 *
 * Call this once during app startup before rendering any components that read
 * atoms. Calling it a second time replaces the previous client.
 *
 * @param serverUrl    - Base HTTP URL of the Vex server (e.g. 'https://chat.example.com')
 * @param deviceID     - UUID of the registered device
 * @param deviceKey    - Ed25519 secret key seed for the device (32 bytes)
 * @param authToken    - Optional JWT to pre-seed the client (from login/register response)
 * @param preKeySecret - Ed25519 secret key seed of the registered preKey (32 bytes).
 *                       Required to decrypt incoming messages via SessionManager.
 */
export async function bootstrap(
  serverUrl: string,
  deviceID: string,
  deviceKey: Uint8Array,
  authToken?: string,
  preKeySecret?: Uint8Array,
  persistence?: PersistenceCallbacks,
): Promise<void> {
  // Clear stale state from any previous session (prevents data leaking between accounts)
  resetAll()

  const client = VexClient.create(serverUrl, deviceID, deviceKey, preKeySecret)
  if (authToken) client.setAuthToken(authToken)
  $client.set(client)

  // Wire real-time events before connecting so nothing is missed
  client.on('authed', (user) => {
    $user.set(user)
  })

  client.on('mail', (mail) => {
    // mail is DecryptedMail — SessionManager already decrypted it inside VexClient
    const me = $user.get()
    if (mail.group) {
      // Group / channel message — key by channelID, deduplicate by mailID
      const prev = $groupMessages.get()[mail.group] ?? []
      if (!prev.some(m => m.mailID === mail.mailID)) {
        $groupMessages.setKey(mail.group, [...prev, mail])
        persistence?.saveGroupMessages($groupMessages.get()).catch(() => {})
        // Track unread (apps call markRead when conversation is focused)
        if (me && mail.authorID !== me.userID) incrementUnread(mail.group)
      }
    } else {
      // Direct message — key by the other party's userID, deduplicate by mailID
      const threadKey = me && mail.authorID === me.userID ? mail.readerID : mail.authorID
      const prev = $messages.get()[threadKey] ?? []
      if (!prev.some(m => m.mailID === mail.mailID)) {
        $messages.setKey(threadKey, [...prev, mail])
        persistence?.saveDmMessages($messages.get()).catch(() => {})
        if (me && mail.authorID !== me.userID) incrementUnread(threadKey)
      }
    }
  })

  client.on('serverChange', (server: any) => {
    const serverID = server.serverID as string
    const joined = server.joined as { userID: string; username: string } | undefined

    // Re-fetch channels for this server (handles new members, new channels, etc.)
    client.listChannels(serverID).then(channels => {
      $channels.setKey(serverID, channels)

      // Insert a "X joined the server" system message into the first channel
      if (joined && channels.length > 0) {
        const channelID = channels[0]!.channelID
        const sysMail: DecryptedMail = {
          mailID: `system-join-${joined.userID}-${Date.now()}`,
          authorID: joined.userID,
          readerID: '',
          group: channelID,
          mailType: 'system',
          time: new Date().toISOString(),
          content: `${joined.username} has joined the server`,
          extra: null,
          forward: null,
        }
        const prev = $groupMessages.get()[channelID] ?? []
        $groupMessages.setKey(channelID, [...prev, sysMail])
        persistence?.saveGroupMessages($groupMessages.get()).catch(() => {})
      }
    }).catch(() => {})
  })

  await client.connect()

  // ── Waterfall: populate initial state ──────────────────────────────────────

  // 1. Current user — throws if not authenticated, letting the caller redirect.
  const user = await client.whoami()
  $user.set(user)

  // 2. Servers
  const servers = await client.listServers()
  for (const server of servers) {
    $servers.setKey(server.serverID, server)
  }

  // 3. Channels + permissions per server (parallel per server)
  await Promise.all(
    servers.map(async (server) => {
      const [channels] = await Promise.all([
        client.listChannels(server.serverID),
        // TODO: populate $permissions once a GET /user/me/permissions endpoint exists
        // client.listPermissions(server.serverID).then(perms => { ... })
      ])
      $channels.setKey(server.serverID, channels)
    }),
  )

  // TODO: populate $familiars + $devices once familiars endpoint exists

  // 4. Load locally persisted messages (instant — no network required).
  //    Privacy model: spire deletes messages after receipt, so local storage is authoritative.
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

  // 5. Fetch any messages received while offline (not yet receipted).
  //    After decrypt, VexClient sends a receipt → spire deletes the message.
  //    The mail event handler above saves to local storage before the receipt is sent.
  try {
    const pending = await client.fetchInbox()
    for (const msg of pending) client.emit('mail', msg)
  } catch {
    // Non-fatal — real-time messages will still arrive via WebSocket
  }
}
