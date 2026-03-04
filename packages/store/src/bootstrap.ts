import { atom } from 'nanostores'
import { VexClient } from '@vex-chat/libvex'
import { $client } from './client.ts'
import { $user } from './user.ts'
import { $messages, $groupMessages } from './messages.ts'
import { $servers } from './servers.ts'
import { $channels } from './channels.ts'
import { $permissions } from './permissions.ts'

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
 * @param serverUrl - Base HTTP URL of the Vex server (e.g. 'https://chat.example.com')
 * @param deviceID  - UUID of the registered device
 * @param deviceKey - Ed25519 secret key for the device (64 bytes)
 */
export async function bootstrap(
  serverUrl: string,
  deviceID: string,
  deviceKey: Uint8Array,
  authToken?: string,
): Promise<void> {
  const client = VexClient.create(serverUrl, deviceID, deviceKey)
  if (authToken) client.setAuthToken(authToken)
  $client.set(client)

  // Wire real-time events before connecting so nothing is missed
  client.on('authed', (user) => {
    $user.set(user)
  })

  client.on('mail', (mail) => {
    if (mail.group) {
      // Group / channel message
      const prev = $groupMessages.get()[mail.group] ?? []
      $groupMessages.setKey(mail.group, [...prev, mail])
    } else {
      // Direct message — key by the other party's userID
      const me = $user.get()
      const threadKey = me && mail.authorID === me.userID ? mail.readerID : mail.authorID
      const prev = $messages.get()[threadKey] ?? []
      $messages.setKey(threadKey, [...prev, mail])
    }
  })

  client.on('serverChange', (server) => {
    $servers.setKey(server.serverID, server)
  })

  await client.connect()

  // ── Waterfall: populate initial state ──────────────────────────────────────

  // 1. Current user
  let user
  try {
    user = await client.whoami()
  } catch {
    // Not authenticated — stop here. The app should navigate to /login.
    return
  }
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
  // TODO: populate $messages + $groupMessages from history once message history endpoints exist
}
