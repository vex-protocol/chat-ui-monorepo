# `packages/libvex` — `@vex-chat/libvex`

Framework-agnostic client SDK. Uses native `fetch`, `eventemitter3` (typed events), `reconnecting-websocket`.

---

## DX Design Principles

### 1. Typed events via EventEmitter3 generics

```ts
interface VexEvents {
  ready:        () => void
  authed:       (user: IUser) => void
  mail:         (mail: DecryptedMail) => void  // decrypted — apps never see raw IMail
  serverChange: (server: IServer) => void
  close:        () => void
  error:        (err: Error) => void
}

class VexClient extends EventEmitter<VexEvents> { ... }
// client.on('mail', (mail) => ...)  — mail is typed DecryptedMail, content is plaintext
```

> **Architecture decision:** Decryption happens inside the SDK, not the app. `VexClient` receives raw `IMail` frames from the WebSocket, decrypts via `SessionManager`, and emits `DecryptedMail`. Apps (desktop, mobile, bots) only ever see plaintext. Pattern follows Signal (libsignal), Matrix (matrix-js-sdk), and Keybase. Key *storage at rest* (Tauri FS, react-native-keychain) is app-specific and injected via `KeyStore` interface.

### 2. Async iterator API — alongside EventEmitter

```ts
// Bot / TUI
for await (const mail of client.mail()) { ... }

// React Native
useEffect(() => {
  const iter = client.mail()
  ;(async () => { for await (const m of iter) setMessages(ms => [...ms, m]) })()
}, [])

// Svelte
const messages = readable([], set => {
  const iter = client.mail()
  ;(async () => { for await (const m of iter) set(prev => [...prev, m]) })()
})
```

### 3. Discriminated union errors

```ts
type SendResult =
  | { ok: true;  mail: IMail }
  | { ok: false; code: 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'NETWORK_ERROR'; message: string }

const result = await client.sendMail(payload)
if (!result.ok) switch (result.code) { ... }
```

### 4. Sub-path export `/bot`

```ts
import { CommandRouter } from '@vex-chat/libvex/bot'
const router = new CommandRouter(client)
router.on('!ping', async (mail) => client.replyTo(mail, 'pong'))
```

### 5. TSDoc on all public methods

For IntelliSense and generated API documentation.

---

## Files

```
packages/libvex/src/
  index.ts         — barrel: VexClient, VexEvents, DecryptedMail, error types, helpers
  client.ts        — VexClient class (extends EventEmitter<VexEvents>)
  connection.ts    — VexConnection: reconnecting-websocket + NaCl challenge handshake
  session.ts       — SessionManager: in-memory session key cache, X3DH encrypt/decrypt
  auth.ts          — register(), login(), logout(), whoami(), getToken()
  mail.ts          — sendMailEncrypted(http, session, content, meta), fetchInboxDecrypted(), mail() async iterator
  devices.ts       — listDevices(), deleteDevice(), fetchKeyBundle()
  servers.ts       — createServer(), listServers(), createChannel()
  http.ts          — typed fetch wrapper: get/post/delete
  iterators.ts     — fromEvent(): EventEmitter → AsyncIterable
  errors.ts        — VexError discriminated union, error factory
  bot/
    index.ts       — CommandRouter, replyTo() helper
    router.ts      — CommandRouter: routes mail to handlers by prefix
```

---

## VexClient public API

```ts
class VexClient extends EventEmitter<VexEvents> {
  // Lifecycle
  static create(serverUrl: string, deviceKey: Uint8Array): VexClient
  async connect(): Promise<void>       // emits "ready"
  async disconnect(): Promise<void>

  // Auth — discriminated union results
  async register(username: string, password: string): Promise<RegisterResult>
  async login(username: string, password: string): Promise<LoginResult>
  async logout(): Promise<void>
  async whoami(): Promise<IUser>
  async getToken(type: TokenType): Promise<IActionToken>

  // Mail — apps use DecryptedMail; IMail wire format is internal to libvex
  async sendMail(content: string, recipientDeviceID: string, recipientUserID: string, options?: { group?: string | null; mailType?: string; extra?: string | null }): Promise<SendResult>
  async fetchInbox(): Promise<DecryptedMail[]>
  mail(): AsyncIterable<DecryptedMail>   // real-time stream, decrypted

  // Devices
  async listDevices(userID: string): Promise<IDevice[]>
  async deleteDevice(userID: string, deviceID: string): Promise<void>
  async fetchKeyBundle(deviceID: string): Promise<IKeyBundle>

  // Servers
  async createServer(name: string): Promise<IServer>
  async listServers(): Promise<IServer[]>
  async listMembers(serverID: string): Promise<IUser[]>
  async createChannel(serverID: string, name: string): Promise<IChannel>

  // Key utils
  static generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array }
}
```

---

## `package.json` shape

```json
{
  "name": "@vex-chat/libvex",
  "private": true,
  "type": "module",
  "exports": {
    ".":     "./src/index.ts",
    "./bot": "./src/bot/index.ts"
  },
  "dependencies": {
    "@vex-chat/types":          "workspace:*",
    "@vex-chat/crypto":         "workspace:*",
    "eventemitter3":            "catalog:",
    "reconnecting-websocket":   "catalog:"
  }
}
```

---

### Multi-device fan-out

`sendMail()` sends to a single `recipientDeviceID`. Multi-device delivery is the app's responsibility — the desktop client (`Messaging.svelte`) calls `listDevices(targetUserID)` and loops over all devices with `Promise.allSettled`. It also forwards to the sender's own other devices (excluding the current device via `loadCredentials().deviceID`) so sent messages appear on all of the sender's devices.

---

See also: [packages.md](packages.md) for the full dependency graph, [packages-store-ui.md](packages-store-ui.md) for the state layer and design system that consume libvex.
