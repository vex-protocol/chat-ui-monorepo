# Spire API Surface & Client Compatibility Map

> Reference for the old spire server (v0.8.0, Express 4, `vex-chat/spire` repo).
> Documents every route, WebSocket message, and wire format detail.
> Identifies incompatibilities with the monorepo's `packages/libvex` SDK.

---

## Wire Format: MessagePack

Old spire uses **msgpack-lite** for most HTTP responses and all WebSocket
frames. The new `packages/libvex` SDK expects **JSON** HTTP responses and a
different WebSocket handshake.

**This is the #1 compatibility issue.** The SDK's `http.ts` module calls
`response.json()`. Old spire sends msgpack-encoded binary. Every HTTP
response will fail to parse until one side adapts.

### Options

1. **Adapter in libvex** — detect msgpack `Content-Type`, decode before
   parsing. Minimal server changes.
2. **Add JSON mode to old spire** — add `Accept: application/json` header
   support. Respond with JSON when requested, msgpack otherwise.
3. **Replace msgpack middleware in spire** — swap `msgpack.encode()` for
   `res.json()` globally. Breaking change for any existing clients.

---

## Data Format Differences

> **All gaps below are bridged** by `packages/libvex/src/wire.ts` (normalization)
> and `packages/libvex/src/http.ts` (msgpack decoding). No spire changes needed.

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
| `IActionToken.time` | `Date` object | `Date` object | Compatible |
| `IServer.icon` | `string?` (optional) | `string` (always present) | Old may omit; new defaults to `""` |
| Login response | `{ user: { userID, username, lastSeen }, token }` | `{ token, userID, username, lastSeen }` | Nested vs flat |

---

## HTTP Routes — Full Surface

### Auth

| Method | Path | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| `POST` | `/auth` | none | `{ username, password }` JSON | msgpack `{ user: ICensoredUser, token }` | Sets `auth` cookie (7d) |
| `POST` | `/register` | none | `{ username, password, signed, signKey, preKey, preKeySignature, preKeyIndex, deviceName }` JSON | msgpack ICensoredUser | Validates register token + NaCl sig |
| `GET` | `/token/:type` | JWT (except `register`) | — | msgpack `{ key, time, scope }` | 10-min single-use UUID |
| `POST` | `/whoami` | JWT | — | msgpack `{ user, exp, token }` | |
| `POST` | `/goodbye` | JWT | — | 200 | Clears auth cookie |

### Users

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `GET` | `/user/:id` | none | msgpack `{ userID, username, lastSeen }` | Looks up by userID or username |
| `GET` | `/user/:id/devices` | JWT | msgpack IDevice[] | |
| `GET` | `/user/:id/permissions` | JWT | msgpack IPermission[] | |
| `GET` | `/user/:id/servers` | JWT | msgpack IServer[] | |
| `POST` | `/user/:id/devices` | JWT | msgpack IDevice | Validates device token + NaCl sig. 470 on dup signKey |
| `DELETE` | `/user/:userID/devices/:deviceID` | JWT | 200 | Soft-delete. Blocks if last device |

### Devices & Keys

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `GET` | `/device/:id` | JWT | msgpack IDevice | Lookup by deviceID or signKey |
| `POST` | `/device/:id/keyBundle` | JWT | msgpack `{ signKey: Uint8Array, preKey, otk? }` | Consumes OTK |
| `POST` | `/device/:id/connect` | JWT | 200 | Sets `device` cookie (7d). Validates connect token |
| `GET` | `/device/:id/otk/count` | device cookie | msgpack `{ count }` | |
| `POST` | `/device/:id/otk` | JWT | 200 | Body: msgpack IPreKeys[]. Validates first sig |
| `POST` | `/device/:id/mail` | device cookie | msgpack `[header, mail, time][]` | Encrypted mail tuples |
| `POST` | `/deviceList` | JWT | msgpack IDevice[] | Body: JSON string[] (userIDs) |

### Servers & Channels

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

### Invites

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `POST` | `/server/:id/invites` | JWT | msgpack IInvite | Requires powerLevel > 25. Body: `{ duration }` (parse-duration) |
| `GET` | `/server/:id/invites` | JWT | msgpack IInvite[] | Requires powerLevel > 25. Filters expired |
| `GET` | `/invite/:id` | none | msgpack IInvite | |
| `PATCH` | `/invite/:id` | JWT | msgpack IPermission | Validates expiration. Creates perm (powerLevel 0). Notifies user |

### Mail

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `POST` | `/mail` | JWT + device | 200 | Body: msgpack `{ header: Uint8Array, mail: IMail }`. Notifies recipient |

### Files

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `GET` | `/file/:id` | JWT | binary stream | |
| `GET` | `/file/:id/details` | JWT | msgpack `{ fileID, owner, nonce, size, birthtime }` | Cached 1yr |
| `POST` | `/file/` | device cookie | msgpack IFile | Multipart form |
| `POST` | `/file/json` | device cookie | msgpack IFile | Body: msgpack `{ file: base64, owner, nonce }` |

### Avatars

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `GET` | `/avatar/:userID` | none | binary stream | Cached 1yr |
| `POST` | `/avatar/:userID` | device cookie | 200 | Multipart form |
| `POST` | `/avatar/:userID/json` | device cookie | 200 | Body: msgpack `{ file: base64 }` |

### Emoji

| Method | Path | Auth | Response | Notes |
|---|---|---|---|---|
| `GET` | `/emoji/:id` | JWT | binary stream | Cached 1yr |
| `GET` | `/emoji/:id/details` | JWT | msgpack IEmoji | |
| `POST` | `/emoji/:serverID` | device cookie | msgpack IEmoji | Multipart. Max 256KB. powerLevel > 25 |
| `POST` | `/emoji/:serverID/json` | device cookie | msgpack IEmoji | Body: msgpack `{ file, name, signed }` |
| `GET` | `/server/:id/emoji` | JWT | msgpack IEmoji[] | |

### User Lists

| Method | Path | Auth | Response |
|---|---|---|---|
| `POST` | `/userList/:channelID` | JWT | msgpack ICensoredUser[] |

---

## WebSocket Protocol (/socket)

### Frame Format

```
[32-byte header (Uint8Array)][msgpack-encoded body]
```

Header is typically all zeros except for mail messages which carry the
encryption header.

### Connection Flow

1. Client opens WS with `auth` + `device` cookies
2. Server sends `challenge`: `{ transmissionID, type: "challenge", challenge: Uint8Array(16) }`
3. Client responds: `{ transmissionID, type: "response", signed: nacl.sign(challenge, deviceSecretKey) }`
4. Server verifies sig against user's devices. Sends `authorized` or `authErr`
5. Ping/pong every 5s. Disconnect on timeout.

### Message Types

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
| `success` | S→C | `data, timestamp?` | Operation result |
| `error` | S→C | `error: string, data?` | Operation failure |
| `notify` | S→C | `event: string, data?` | Server push |

### Notify Events

| Event | Data | Meaning |
|---|---|---|
| `mail` | null | New mail available for device |
| `permission` | IPermission | User gained server access |
| `serverChange` | serverID string | Server/channel structure changed |

---

## Route Compatibility (libvex ↔ spire)

| SDK method | Status | Notes |
|---|---|---|
| `searchUsers(query)` | **Graceful fallback** | Route doesn't exist in spire; SDK returns `[]` |
| `joinServerViaInvite(id)` | **Fixed** | SDK now uses `PATCH /invite/:id` (was `POST /invite/:id/join`) |
| `deleteInvite(s, id)` | **Throws** | Route doesn't exist in spire; SDK throws with clear message |
| Open registration token | **Not supported** | `GET /token/open/register` doesn't exist in spire |

## Routes in Old Spire Not Used by New libvex

| Route | Old spire | Notes |
|---|---|---|
| `POST /emoji/:id` | Upload emoji | SDK has no emoji support yet |
| `GET /emoji/:id` | Download emoji | SDK has no emoji support yet |
| `POST /file/json` | Base64 file upload | SDK uses multipart only |
| `POST /avatar/:id/json` | Base64 avatar upload | SDK uses multipart only |

---

## Authentication — Cookie vs Bearer

Old spire uses two **HTTP cookies**:
- `auth` — JWT with `{ user: ICensoredUser }`, 7-day, same-site none, secure
- `device` — JWT with `{ device: IDevice }`, 7-day, same-site none, secure

New libvex sends `Authorization: Bearer <token>` header and expects token
in the JSON response body.

**Compatibility path:** Old spire's `checkAuth` middleware reads
`req.cookies.auth`. The SDK sends `Authorization` header. Need to update
either:
- Spire: check `Authorization` header as fallback
- libvex: set cookies instead of headers

---

## Power Levels

```
INVITE: 25    — create/list invites, upload emoji
CREATE: 50    — create channels
DELETE: 50    — delete channels/servers/permissions
Owner:  100   — all operations
Member: 0     — read-only (joined via invite)
```

---

See also: [auth-comparison.md](../explanation/auth-comparison.md) for auth
design decisions, [vex-overview.md](../vex-overview.md) for the cryptographic protocol.
