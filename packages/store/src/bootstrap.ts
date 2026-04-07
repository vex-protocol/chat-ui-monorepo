import { Client } from '@vex-chat/libvex'
import type { IMessage, PlatformPreset, KeyStore } from '@vex-chat/libvex'
import { $client } from './client.ts'
import { $user } from './user.ts'
import { $messages, $groupMessages } from './messages.ts'
import { $servers } from './servers.ts'
import { $channels } from './channels.ts'
import { $permissions } from './permissions.ts'
import { resetAll } from './reset.ts'
import { incrementDmUnread, incrementChannelUnread } from './unread.ts'
import { $familiars } from './familiars.ts'
import { $keyReplaced } from './key-replaced.ts'

/** Server connection options — identical across all auth flows. */
export interface ServerOptions {
  host: string
  unsafeHttp?: boolean
  logLevel?: string
  inMemoryDb?: boolean
}

/** Result from any auth flow. */
export interface AuthResult {
  ok: boolean
  keyReplaced?: boolean
  error?: string
}

/**
 * Internal: creates the Client, wires events to nanostores atoms.
 * All public auth flows call this after obtaining a private key.
 */
async function initClient(
  privateKey: string,
  preset: PlatformPreset,
  options: ServerOptions,
): Promise<Client> {
  resetAll()

  const storage = await preset.createStorage('vex-client.db', privateKey, preset.adapters.logger)
  const client = await Client.create(
    privateKey,
    { ...options, adapters: preset.adapters } as any,
    storage,
  )
  $client.set(client)

  // Wire real-time events
  client.on('message', (msg: IMessage) => {
    preset.adapters.logger.info('[vex-store] message: id=' + msg.mailID + ' group=' + msg.group + ' dir=' + msg.direction + ' decrypted=' + msg.decrypted + ' from=' + msg.authorID + ' msg=' + msg.message?.slice(0, 30))
    const me = $user.get()
    if (msg.group) {
      const prev = $groupMessages.get()[msg.group] ?? []
      preset.adapters.logger.info('[vex-store] group key=' + msg.group + ' prev=' + prev.length + ' dup=' + prev.some(m => m.mailID === msg.mailID))
      if (!prev.some(m => m.mailID === msg.mailID)) {
        $groupMessages.setKey(msg.group, [...prev, msg])
        preset.adapters.logger.info('[vex-store] added to $groupMessages[' + msg.group + '], now ' + ($groupMessages.get()[msg.group]?.length ?? 0) + ' messages')
        if (me && msg.authorID !== me.userID) incrementChannelUnread(msg.group)
      }
    } else {
      const isOwnMessage = me && msg.authorID === me.userID
      const threadKey = isOwnMessage ? msg.readerID : msg.authorID
      const prev = $messages.get()[threadKey] ?? []

      if (!prev.some(m => m.mailID === msg.mailID)) {
        $messages.setKey(threadKey, [...prev, msg])
        if (!isOwnMessage) incrementDmUnread(threadKey)

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

  return client
}

/**
 * Register a new account → save credentials → connect.
 * One call replaces: Client.create + register + keyStore.save + connect + event wiring.
 */
export async function registerAndBootstrap(
  username: string,
  password: string,
  preset: PlatformPreset,
  options: ServerOptions,
  keyStore: KeyStore,
): Promise<AuthResult> {
  try {
    const privateKey = Client.generateSecretKey()
    const client = await initClient(privateKey, preset, options)

    const [user, regErr] = await client.register(username, password)
    if (regErr || !user) {
      return { ok: false, error: regErr?.message ?? 'Registration failed' }
    }

    // login() sets the auth cookie needed by connect()
    const loginErr = await client.login(username, password)
    if (loginErr) {
      return { ok: false, error: 'Registered but login failed: ' + loginErr.message }
    }

    // connect() populates device details and authenticates
    await client.connect()
    const currentUser = client.me.user()
    preset.adapters.logger.info('[vex-store] Setting $user: ' + currentUser.username + ' (' + currentUser.userID + ')')
    $user.set(currentUser)

    try {
      await keyStore.save({
        username,
        deviceID: client.me.device().deviceID,
        deviceKey: privateKey,
      })
    } catch (saveErr: any) {
      preset.adapters.logger.warn('[vex-store] keyStore.save failed: ' + saveErr?.message)
      // Non-fatal — user is authenticated, just won't auto-login next time
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}

/**
 * Login with existing credentials → save credentials → connect.
 * If no device exists on this machine, registers a new device automatically.
 */
export async function loginAndBootstrap(
  username: string,
  password: string,
  preset: PlatformPreset,
  options: ServerOptions,
  keyStore: KeyStore,
): Promise<AuthResult> {
  try {
    // Check if we have a saved device key for this username
    const creds = await keyStore.load(username)
    const privateKey = creds?.deviceKey ?? Client.generateSecretKey()

    const client = await initClient(privateKey, preset, options)
    const loginErr = await client.login(username, password)

    if (loginErr) {
      return { ok: false, error: 'Invalid username or password' }
    }

    // connect() populates device details and authenticates
    await client.connect()
    $user.set(client.me.user())

    if (!creds) {
      // First login on this machine — register a new device
      await client.devices.register()
      await keyStore.save({
        username,
        deviceID: client.me.device().deviceID,
        deviceKey: privateKey,
      })
    }
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}

/**
 * Auto-login from stored credentials → connect.
 * Returns { ok: false } if no credentials found.
 */
export async function autoLogin(
  keyStore: KeyStore,
  preset: PlatformPreset,
  options: ServerOptions,
): Promise<AuthResult> {
  const creds = await keyStore.load()
  if (!creds) return { ok: false }

  try {
    const client = await initClient(creds.deviceKey, preset, options)
    await client.connect()
    $user.set(client.me.user())
    return { ok: true }
  } catch (err: any) {
    if ($keyReplaced.get()) return { ok: false, keyReplaced: true }
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}
