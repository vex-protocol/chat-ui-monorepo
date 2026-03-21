# Migration from Upstream Repos

Detailed API-level comparison between the original standalone repos (`libvex-js`, `vex-desktop`, `spire`) and the current `vex-chat` monorepo. For the high-level decision and trade-offs behind the consolidation, see [ADR-001: Monorepo Consolidation](../architecture/adr-001-monorepo-consolidation.md). For architecture and framework differences (Electron vs Tauri, React vs Svelte), see [`desktop-reimplementation.md`](./desktop-reimplementation.md).

---

## Repo Mapping

| Original repo | Monorepo equivalent | Key changes |
|---|---|---|
| `libvex-js` (`@vex-chat/libvex` v0.21) | `packages/libvex` | Flat methods instead of sub-objects; caller resolves devices; `@noble/curves` replaces `tweetnacl` |
| `types-js` (`@vex-chat/types`) | `packages/types` | Dates as ISO strings instead of `Date` objects; `DecryptedMail` replaces `IMessage` |
| `crypto-js` (`@vex-chat/crypto` v0.7) | `packages/crypto` | `@noble/curves` + `@noble/hashes` replace `tweetnacl` + `ed2curve` + `futoin-hkdf` |
| `spire` (standalone Express) | Own repo ([`vex-chat/spire`](https://github.com/vex-chat/spire)) | Stays standalone |
| `vex-desktop` (Electron + React) | `apps/desktop` (Tauri + Svelte) | See `desktop-reimplementation.md` |
| -- | `packages/store` | New -- nanostores atoms, shared across desktop and mobile |
| -- | `packages/ui` | New -- Mitosis design primitives compiled to Svelte + React |
| -- | `apps/mobile` | New -- React Native mobile client |

---

## libvex API Comparison

### Factory and Lifecycle

| Old (`Client`) | New (`VexClient`) | Notes |
|---|---|---|
| `Client.create(privateKey, opts, storage)` | `VexClient.create(serverUrl, deviceKey)` | No storage param -- key storage is app-specific |
| `Client.generateSecretKey()` | `VexClient.generateKeyPair()` | Returns `{ publicKey, secretKey }` instead of hex string |
| `Client.randomUsername()` | -- | Removed |
| `Client.loadKeyFile(path)` / `Client.saveKeyFile(path, key)` | -- | Moved to app layer (Tauri FS, react-native-keychain) |
| `client.connect()` | `client.connect()` | Same |
| `client.close()` | `client.disconnect()` | Renamed |

### Authentication

| Old | New | Notes |
|---|---|---|
| `client.login(user, pass)` -> `Error \| null` | `client.login(user, pass)` -> `Promise<LoginResult>` | Discriminated union instead of nullable error |
| `client.register(user, pass)` -> `[IUser \| null, Error \| null]` | `client.register(user, pass, payload)` -> `Promise<RegisterResult>` | Discriminated union; payload includes device registration |
| `client.logout()` | `client.logout()` | Same |
| `client.whoami()` -> `{ user, exp, token }` | `client.whoami()` -> `Promise<IUser>` | Returns user only |
| -- | `client.getToken(type)` -> `Promise<IActionToken>` | Exposed (was internal in old) |

### Messaging

| Old | New | Notes |
|---|---|---|
| `client.messages.send(userID, msg)` | `client.sendMail(content, deviceID, userID)` | **Breaking:** caller must resolve devices first via `listDevices()` |
| `client.messages.group(channelID, msg)` | `client.sendMail(content, deviceID, userID, { group: channelID })` | App enumerates members via `listMembers()` + devices, fans out with `Promise.allSettled` |
| `client.messages.retrieve(userID)` | `client.fetchInbox()` | Fetches all pending, not per-user history |
| `client.messages.retrieveGroup(channelID)` | -- | Not yet implemented (needs spire endpoint) |
| `client.messages.delete(id, duration?)` | -- | Not yet implemented |
| `client.messages.purge()` | -- | Not yet implemented |
| -- | `client.mail()` -> `AsyncIterable<DecryptedMail>` | New real-time stream API |

**Key design change:** Old libvex resolved recipient devices internally in `messages.send()`. New libvex requires the caller to call `listDevices(userID)` first and pass the `deviceID` explicitly. This gives apps control over device selection (e.g. multi-device, choosing which device to target).

### Users and Devices

| Old | New | Notes |
|---|---|---|
| `client.users.retrieve(userID)` -> `[IUser \| null, Error \| null]` | `client.getUser(userID)` -> `Promise<IUser \| null>` | Simplified return |
| `client.users.familiars()` -> `Promise<IUser[]>` | -- | Moved to store layer (`$familiars` atom) |
| -- | `client.searchUsers(query)` -> `Promise<IUser[]>` | New (max 10 results) |
| `client.devices.retrieve(id)` | `client.listDevices(userID)` -> `Promise<IDevice[]>` | Returns array of all devices |
| `client.devices.register()` | -- | Handled during registration |
| `client.devices.delete(deviceID)` | -- | Not yet exposed |
| -- | `client.fetchKeyBundle(deviceID)` -> `Promise<IKeyBundle>` | Exposed (was internal in old) |

### Servers and Channels

| Old | New | Notes |
|---|---|---|
| `client.servers.retrieve()` | `client.listServers()` | Flat method |
| `client.servers.retrieveByID(id)` | -- | Not yet implemented |
| `client.servers.create(name)` | `client.createServer(name, icon)` | Added icon parameter |
| `client.servers.delete(serverID)` | `client.deleteServer(serverID)` | Flat method |
| `client.servers.leave(serverID)` | -- | Not yet implemented |
| `client.channels.retrieve(serverID)` | `client.listChannels(serverID)` | Flat method |
| `client.channels.retrieveByID(id)` | -- | Not yet implemented |
| `client.channels.create(name, serverID)` | `client.createChannel(serverID, name)` | Param order swapped |
| `client.channels.delete(channelID)` | `client.deleteChannel(channelID)` | Flat method |
| `client.channels.userList(channelID)` | `client.listMembers(serverID)` | Returns `IUser[]` — all server members (joins permissions with user profiles) |

### Sessions, Files, Invites, Emoji, Moderation

These sub-objects existed in old libvex but are **not yet ported** to the new:

| Old sub-object | Methods | Status |
|---|---|---|
| `client.sessions` | `retrieve()`, `verify()`, `markVerified()` | Not ported |
| `client.files` | `create(buffer)`, `retrieve(id, key)` | Ported — `client.uploadFile()`, `client.downloadFile()`, `client.fileUrl()` |
| `client.invites` | `create(serverID, duration)`, `redeem(id)`, `retrieve(serverID)` | Ported — `client.createInvite()`, `client.joinServerViaInvite()`, `client.listInvites()`, `client.deleteInvite()` |
| `client.emoji` | `create(buffer, name, serverID)`, `retrieveList(serverID)` | Not ported |
| `client.moderation` | `kick(userID, serverID)`, `fetchPermissionList(serverID)` | Not ported |
| `client.permissions` | `retrieve()`, `delete(permissionID)` | Not ported |

### Avatars

| Old | New | Notes |
|---|---|---|
| `client.me.setAvatar(buffer)` | `client.setAvatar(data, mimeType)` | Added MIME type param |
| -- | `client.avatarUrl(userID, version?)` | New helper for constructing avatar URLs |

### Events

| Old event | New event | Notes |
|---|---|---|
| `"ready"` | `"ready"` | Same |
| `"connected"` | -- | Merged into `"ready"` |
| `"message"` -> `IMessage` | `"mail"` -> `DecryptedMail` | Renamed; decryption is internal |
| `"session"` -> `ISession, IUser` | -- | Not yet implemented |
| `"permission"` -> `IPermission` | -- | Not yet implemented |
| `"disconnect"` | `"close"` | Renamed |
| `"closed"` | -- | Merged into `"close"` |
| `"decryptingMail"` | -- | Removed |
| `"fileProgress"` -> `IFileProgress` | -- | Not yet implemented |
| -- | `"authed"` -> `IUser` | New |
| -- | `"serverChange"` -> `IServer` | New |
| -- | `"error"` -> `Error` | New |

---

## Types Comparison

### Core Types

| Type | Old shape | New shape | Diff |
|---|---|---|---|
| `IUser` | `{ userID, username, lastSeen: Date }` | `{ userID, username, lastSeen: string }` | `Date` -> ISO string |
| `IDevice` | `{ deviceID, owner, signKey, name, lastLogin, deleted }` | `{ deviceID, signKey, owner, name, lastLogin }` | `deleted` field removed |
| `IServer` | `{ serverID, name, icon? }` | `{ serverID, name, icon }` | `icon` always present (empty string default) |
| `IChannel` | `{ channelID, serverID, name }` | `{ channelID, serverID, name }` | Identical |
| `IPermission` | `{ permissionID, userID, resourceType, resourceID, powerLevel }` | Same | Identical |
| `IInvite` | `{ inviteID, serverID, owner, expiration }` | Same | Identical |

### Message Types

The biggest type change: `IMessage` (old) is replaced by two types in the new system.

**Old `IMessage`** (what apps received):
```typescript
interface IMessage {
  nonce: string
  mailID: string
  sender: string           // userID
  recipient: string        // userID
  message: string          // plaintext content
  direction: "incoming" | "outgoing"
  timestamp: Date
  decrypted: boolean       // whether decryption succeeded
  group: string | null     // channelID for group, null for DM
  forward: boolean
  authorID: string
  readerID: string
}
```

**New `DecryptedMail`** (what apps receive):
```typescript
interface DecryptedMail {
  mailID: string
  authorID: string         // sender userID
  readerID: string         // recipient userID
  group: string | null     // channelID for group, null for DM
  mailType: string
  time: string             // ISO timestamp
  content: string          // plaintext body
  extra: string | null
  forward: string | null
}
```

Key differences:
- `sender`/`recipient` -> `authorID`/`readerID`
- `message` -> `content`
- `timestamp: Date` -> `time: string` (ISO)
- `direction` removed -- derive from `authorID === myUserID`
- `decrypted` removed -- SDK handles decryption internally; if it fails, the message is not emitted
- `nonce` removed -- internal to wire format

**Wire format `IMail`** (internal to libvex, never exposed to apps):

| Old | New |
|---|---|
| Fields as `Uint8Array` | Fields as hex strings |
| Consumed by apps | Internal to SDK only |

### Crypto Types

| Old | New | Notes |
|---|---|---|
| `IKeys { public: string, private: string }` | `{ publicKey: Uint8Array, secretKey: Uint8Array }` | Bytes instead of hex |
| `ISession` (SQL-backed) | Not exposed | Session management internal to SDK |
| `IFileProgress { token, direction, progress, loaded, total }` | -- | Not yet implemented |

### Token Types

| Old | New | Notes |
|---|---|---|
| Implicit token scopes | `TokenType = 'file' \| 'avatar' \| 'register' \| 'device' \| 'invite' \| 'emoji' \| 'connect'` | Explicit union type |
| -- | `IActionToken { key, scope, time }` | Formalized |
| -- | `ITokenStore { create(), validate() }` | Server-side abstraction |

---

## Spire Routes Comparison

Routes implemented in the current spire server.

### Identical Routes

These endpoints have the same HTTP method, path, and semantics:

- `POST /register` -- register user with device
- `POST /auth` -- login
- `POST /whoami` -- verify token
- `POST /goodbye` -- logout
- `GET /token/:type` -- request action token
- `GET /user/:id` -- get user profile
- `GET /user/:id/devices` -- list devices
- `GET /user/:id/permissions` -- get permissions
- `GET /user/:id/servers` -- list user's servers
- `POST /device/:id/connect` -- authenticate device
- `POST /device/:id/keyBundle` -- get X3DH key bundle
- `POST /device/:id/mail` -- fetch encrypted inbox
- `GET /device/:id/otk/count` -- OTK count
- `POST /device/:id/otk` -- upload OTKs
- `POST /mail` -- deliver encrypted message
- `POST /deviceList` -- batch device lookup
- `GET /server/:id` -- server details
- `GET /server/:id/channels` -- list channels
- `POST /server/:id/channels` -- create channel
- `DELETE /server/:id` -- delete server
- `GET /channel/:id` -- channel details
- `DELETE /channel/:id` -- delete channel
- `POST /server/:id/invites` -- create invite
- `GET /server/:id/invites` -- list invites
- `GET /invite/:id` -- get invite details
- `PATCH /invite/:id` -- redeem invite
- `DELETE /permission/:id` -- delete permission
- `POST /userList/:channelID` -- channel user list
- `WS /socket` -- WebSocket (NaCl challenge handshake)

### New Routes (not in old spire)

| Route | Purpose |
|---|---|
| `GET /user/search?q=query` | Search users by username (max 10 results) |
| `GET /token/open/register` | Open registration token (no auth required, if enabled) |

### Old Routes Not Yet Ported

| Route | Purpose | Status |
|---|---|---|
| `POST /file` | Upload encrypted file | Needs file upload infrastructure |
| `GET /file/:id` | Download file | Needs file storage |
| `GET /file/:id/details` | File metadata | Needs file storage |
| `POST /file/json` | Upload file as base64 | Needs file storage |
| `POST /avatar/:userID` | Upload avatar (multipart) | Partially implemented |
| `POST /avatar/:userID/json` | Upload avatar (base64) | Partially implemented |
| `GET /avatar/:userID` | Download avatar | Partially implemented |
| `POST /emoji/:serverID` | Upload emoji | Not started |
| `GET /emoji/:emojiID` | Download emoji image | Not started |
| `GET /emoji/:emojiID/details` | Emoji metadata | Not started |
| `POST /emoji/:serverID/json` | Upload emoji (base64) | Not started |
| `GET /server/:serverID/emoji` | List server emoji | Not started |
| `GET /server/:serverID/permissions` | List server permissions | Not started |

### Planned Server Improvements

The server stays in its own repo. These improvements are tracked separately.

| Aspect | Status | Notes |
|---|---|---|
| **Password hashing** | **Done** — argon2id with lazy PBKDF2 migration | Old hashes auto-upgrade on login |
| **Crypto** | **Done** — @noble/curves replaces TweetNaCl | Ed25519 signing via `naclCompat.ts` |
| **JWT secret** | Still reuses SPK | Consider dedicated JWT_SECRET |
| **Logging** | Winston — tokens/IDs may appear in logs | Consider redaction |
| **Validation** | Manual checks in route handlers | Consider Zod schemas |
| **ORM** | Knex (query builder) | Consider Kysely for type safety |
| **Module system** | CommonJS | Consider ESM |
| **Error handling** | Stack traces may leak to clients | Consider generic error messages |

---

## Crypto Comparison

### Same Protocol

Both old and new use the same cryptographic protocol:
- **Ed25519** signing keys for identity
- **X25519** Diffie-Hellman for key agreement
- **X3DH-lite** session establishment (3 DH exchanges -> HKDF-SHA256 -> session key)
- **XSalsa20-Poly1305** (NaCl secretbox) for symmetric message encryption
- 24-byte random nonce per message

### Different Libraries

| Purpose | Old | New |
|---|---|---|
| Ed25519 signing | `tweetnacl` | `@noble/curves/ed25519` |
| Ed25519 -> X25519 | `ed2curve` | `@noble/curves` built-in `toMontgomery` |
| HKDF key derivation | `futoin-hkdf` | `@noble/hashes/hkdf` |
| Symmetric encryption | `tweetnacl.secretbox` | `@noble/ciphers` (XSalsa20-Poly1305) |

All new libraries are ESM-native, Cure53-audited, and actively maintained.

### Key Representation

| Old | New |
|---|---|
| Keys as hex strings in most APIs | Keys as `Uint8Array` in public API |
| Hex conversion happens everywhere | Hex conversion at protocol boundary only |

---

## State Management Comparison

| Aspect | Old (vex-desktop) | New (vex-chat) |
|---|---|---|
| **Library** | Redux Toolkit + Redux Saga | nanostores atoms |
| **Slices** | 14 Redux slices in `rootReducer.ts` | ~10 nanostores atoms in `packages/store` |
| **Side effects** | Redux Saga middleware | Direct event wiring in `bootstrap()` |
| **Sharing** | Desktop-only | Shared across desktop (Svelte) + mobile (React Native) |
| **Serialization** | `Date` -> string for Redux (via `serializeMessage`) | Already strings (ISO format in types) |
| **Framework binding** | `react-redux` `useSelector`/`useDispatch` | Svelte native `$atom` / React `useStore($atom)` |
| **Bundle size** | Redux + Redux Toolkit + React-Redux | nanostores (265-800 bytes) |

### Slice Mapping

| Old Redux slice | New nanostores atom | Notes |
|---|---|---|
| `user` | `$user` | Same shape |
| `familiars` | `$familiars` | Same concept |
| `messages` | `$messages` | Keyed by userID, stores `DecryptedMail[]` |
| `groupMessages` | `$groupMessages` | Keyed by channelID |
| `sessions` | -- | Not yet implemented |
| `servers` | `$servers` | Same shape |
| `channels` | `$channels` | Same shape |
| `permissions` | `$permissions` | Same shape |
| `devices` | `$devices` | Same shape |
| `onlineLists` | `$onlineLists` | Same shape |
| `historyStacks` | -- | Replaced by router state |
| `avatarHash` | `$avatarHash` | Same concept |
| `files` | -- | Not yet implemented |
| `app` (themeColors, failCount, etc.) | App-local state | Per-platform, not shared |

---

## Desktop Routes Comparison

| Old route (vex-desktop) | New route (apps/desktop) | Notes |
|---|---|---|
| `/` (Home) | `/` (Launch) | Same role |
| `/launch` (ClientLauncher) | `/launch` (Launch) | Bootstrap sequence moved to `packages/store` |
| `/login` | `/login` | Same |
| `/register` | `/register` | Same |
| `/messaging/:userID/:page/:sessionID` | `/messaging/:userID` | Simplified -- no pagination or session params |
| `/server/:serverID/:pageType/:channelID/:channelPage` | `/server/:serverID/:channelID` | Simplified -- no page type nesting |
| `/settings` | `/settings` | Same |
| `/create/:resourceType` | -- | Inline in UI (create server/channel modals) |
| `/logout` | -- | Handled in UserMenu component |
| `/updating` | -- | Not yet implemented |

---

## Not Yet Ported from Upstream

Features that existed in the old repos but are not yet in the monorepo:

| Feature | Old location | Blocked by |
|---|---|---|
| File upload/download | `client.files`, `POST/GET /file` | Server file storage infrastructure |
| Custom emoji | `client.emoji`, `/emoji` routes | Server emoji storage |
| Session verification UI | `client.sessions.verify()` -> mnemonic | Crypto session tracking in new libvex |
| Message history pagination | `client.messages.retrieve()` with pages | Spire history endpoint |
| Message deletion | `client.messages.delete()` | Spire endpoint |
| Invite management UI | Full invite CRUD | UI work (spire routes exist) |
| Permission management UI | Full permission CRUD | UI work (spire routes exist) |
| Moderation (kick) | `client.moderation.kick()` | Spire endpoint |
| Online user presence | Redux `onlineLists` slice | WebSocket presence protocol |
| Auto-update | `electron-updater` | Release infrastructure |
| Deep links (`vex://`) | Electron protocol handler | Platform registration (Tauri plugin) |
| Markdown rendering | `react-markdown` | Svelte equivalent needed |
| Emoji picker | `emoji-mart` | UI component |
| Syntax highlighting | `highlight.js` | UI component |
| Theme customization | Configurable colors in settings | Settings UI |

---

## Spire API Surface (Full Reference)

> Detailed HTTP route tables, WebSocket protocol, and wire format for the old spire server (v0.8.0, Express 4).

### Wire Format: MessagePack

Old spire uses **msgpack-lite** for most HTTP responses and all WebSocket frames. The `packages/libvex` SDK expects **JSON** HTTP responses. The SDK's `http.ts` module and `wire.ts` normalization layer bridge these differences — no spire changes needed.

### Data Format Differences

> All gaps are bridged by `packages/libvex/src/wire.ts` (normalization) and `packages/libvex/src/http.ts` (msgpack decoding).

| Field | Spire (msgpack) | libvex types | Gap |
|---|---|---|---|
| `IUser.lastSeen` | `Date` object | `string` (ISO 8601) | msgpack encodes native Date; SDK expects string |
| `IDevice.lastLogin` | `string` | `string \| null` | Old stores empty string; new allows null |
| `IDevice.deleted` | `boolean` present | field absent | New types removed `deleted` field |
| `IMail.sender` | `string` (deviceID) | `string` (hex signKey, 64 chars) | **Critical** — different semantics |
| `IMail.cipher` | `Uint8Array` (msgpack binary) | `string` (hex) | Encoding mismatch |
| `IMail.nonce` | `Uint8Array` | `string` (hex, 48 chars) | Encoding mismatch |
| `IMail.header` | `Uint8Array` (32 bytes) | `string` (hex, 64 chars) | Encoding mismatch |
| `IMail.extra` | `Uint8Array` | `string \| null` (hex) | Encoding + nullability |
| `IMail.group` | `Uint8Array \| null` | `string \| null` | Encoding mismatch |
| `IMail.mailType` | `number` | `string` | Type mismatch |
| `IKeyBundle.signKey` | `Uint8Array` | `string` (hex) | Encoding mismatch |
| `IKeyBundle.preKey` | `{ publicKey: Uint8Array, signature: Uint8Array, index }` | `{ publicKey: string, signature: string, index }` | Uint8Array → hex |
| `IServer.icon` | `string?` (optional) | `string` (always present) | Old may omit; new defaults to `""` |
| Login response | `{ user: { userID, username, lastSeen }, token }` | `{ token, userID, username, lastSeen }` | Nested vs flat |

### HTTP Routes — Full Surface

#### Auth

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| `POST` | `/auth` | none | `{ username, password }` JSON | msgpack `{ user, token }` | Sets `auth` cookie (7d) |
| `POST` | `/register` | none | `{ username, password, signed, signKey, preKey, preKeySignature, preKeyIndex, deviceName }` JSON | msgpack ICensoredUser | Validates register token + NaCl sig |
| `GET` | `/token/:type` | JWT (except `register`) | — | msgpack `{ key, time, scope }` | 10-min single-use UUID |
| `POST` | `/whoami` | JWT | — | msgpack `{ user, exp, token }` | |
| `POST` | `/goodbye` | JWT | — | 200 | Clears auth cookie |

#### Users

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `GET` | `/user/:id` | none | msgpack `{ userID, username, lastSeen }` | Looks up by userID or username |
| `GET` | `/user/:id/devices` | JWT | msgpack IDevice[] | |
| `GET` | `/user/:id/permissions` | JWT | msgpack IPermission[] | |
| `GET` | `/user/:id/servers` | JWT | msgpack IServer[] | |
| `POST` | `/user/:id/devices` | JWT | msgpack IDevice | Validates device token + NaCl sig. 470 on dup signKey |
| `DELETE` | `/user/:userID/devices/:deviceID` | JWT | 200 | Soft-delete. Blocks if last device |

#### Devices & Keys

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `GET` | `/device/:id` | JWT | msgpack IDevice | Lookup by deviceID or signKey |
| `POST` | `/device/:id/keyBundle` | JWT | msgpack `{ signKey, preKey, otk? }` | Consumes OTK |
| `POST` | `/device/:id/connect` | JWT | 200 | Sets `device` cookie (7d). Validates connect token |
| `GET` | `/device/:id/otk/count` | device cookie | msgpack `{ count }` | |
| `POST` | `/device/:id/otk` | JWT | 200 | Body: msgpack IPreKeys[]. Validates first sig |
| `POST` | `/device/:id/mail` | device cookie | msgpack `[header, mail, time][]` | Encrypted mail tuples |
| `POST` | `/deviceList` | JWT | msgpack IDevice[] | Body: JSON string[] (userIDs) |

#### Servers & Channels

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `GET` | `/server/:id` | none | msgpack IServer | |
| `POST` | `/server/:name` | JWT | msgpack IServer | `:name` is base64-encoded. Creates "general" channel + owner perm (100) |
| `DELETE` | `/server/:id` | JWT | 200 | Requires powerLevel > 50 |
| `GET` | `/server/:id/channels` | JWT | msgpack IChannel[] | Requires server permission |
| `POST` | `/server/:id/channels` | JWT | msgpack IChannel | Requires powerLevel > 50. Notifies users |
| `GET` | `/channel/:id` | JWT | msgpack IChannel | |
| `DELETE` | `/channel/:id` | JWT | 200 | Requires powerLevel > 50 |
| `GET` | `/server/:id/permissions` | JWT | msgpack IPermission[] | Requires server permission |
| `DELETE` | `/permission/:id` | JWT | 200 | Self-delete or higher powerLevel |

#### Invites

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `POST` | `/server/:id/invites` | JWT | msgpack IInvite | Requires powerLevel > 25 |
| `GET` | `/server/:id/invites` | JWT | msgpack IInvite[] | Requires powerLevel > 25. Filters expired |
| `GET` | `/invite/:id` | none | msgpack IInvite | |
| `PATCH` | `/invite/:id` | JWT | msgpack IPermission | Validates expiration. Creates perm (powerLevel 0) |

#### Mail, Files, Avatars, Emoji

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/mail` | JWT + device | Body: msgpack `{ header, mail }`. Notifies recipient |
| `GET` | `/file/:id` | JWT | Binary stream |
| `POST` | `/file/` | device cookie | Multipart form |
| `GET` | `/avatar/:userID` | none | Cached 1yr |
| `POST` | `/avatar/:userID` | device cookie | Multipart form |
| `GET` | `/emoji/:id` | JWT | Cached 1yr |
| `POST` | `/emoji/:serverID` | device cookie | Multipart. Max 256KB. powerLevel > 25 |

### WebSocket Protocol (/socket)

**Frame format:** `[32-byte header (Uint8Array)][msgpack-encoded body]`

**Connection flow:**
1. Client opens WS with `auth` + `device` cookies
2. Server sends `challenge`: `{ transmissionID, type: "challenge", challenge: Uint8Array(16) }`
3. Client responds: `{ transmissionID, type: "response", signed: nacl.sign(challenge, deviceSecretKey) }`
4. Server verifies sig. Sends `authorized` or `authErr`
5. Ping/pong every 5s. Disconnect on timeout.

**Message types:**

| Type | Direction | Fields | Notes |
|---|---|---|---|
| `challenge` | S→C | `challenge: Uint8Array(16)` | UUID v4 bytes |
| `response` | C→S | `signed: Uint8Array` | NaCl-signed challenge |
| `authorized` | S→C | — | Auth success |
| `authErr` | S→C | `error: SocketAuthErrors` | BadSignature, InvalidToken, UserNotRegistered |
| `ping` | S→C | — | Every 5s |
| `pong` | C→S | — | Must reply within 5s |
| `resource` | C→S | `resourceType, action, data` | Only `mail/CREATE` supported |
| `receipt` | C→S | `nonce: Uint8Array` | Deletes mail by nonce |
| `notify` | S→C | `event, data?` | Server push: `mail`, `permission`, `serverChange` |

### Authentication: Cookie vs Bearer

Old spire uses two HTTP cookies (`auth` + `device`, 7-day, same-site none). New libvex sends `Authorization: Bearer <token>` header. The SDK's `http.ts` handles this by setting cookies when talking to old spire.

### Power Levels

```
INVITE: 25    — create/list invites, upload emoji
CREATE: 50    — create channels
DELETE: 50    — delete channels/servers/permissions
Owner:  100   — all operations
Member: 0     — read-only (joined via invite)
```

### SDK ↔ Spire Compatibility

| SDK method | Status | Notes |
|---|---|---|
| `searchUsers(query)` | **Graceful fallback** | Route doesn't exist; SDK falls back to exact username lookup |
| `joinServerViaInvite(id)` | **Fixed** | SDK uses `PATCH /invite/:id` |
| `deleteInvite(s, id)` | **Throws** | Route doesn't exist; SDK throws with clear message |

---

See also: [desktop-reimplementation.md](desktop-reimplementation.md) for Electron → Tauri component mapping, [vex-overview.md](../vex-overview.md) for the original protocol reference.
