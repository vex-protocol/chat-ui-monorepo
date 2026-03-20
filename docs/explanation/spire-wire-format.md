# Old Spire Wire Format vs New libvex Protocol

## Why this document exists

The new libvex SDK was designed for a future server that speaks a simplified protocol. Since we're staying on old spire, the two wire formats are incompatible. This document captures the exact differences and the translation strategy.

## New libvex protocol (X3DH-lite)

Our `SessionManager` in `packages/libvex/src/session.ts` uses:

- **Fresh ephemeral key per message** — no session persistence or reuse
- **3-DH key derivation**: `HKDF-SHA256(DH(identity, preKey) || DH(ephemeral, identity) || DH(ephemeral, preKey))`
- **IMail fields are hex strings**: `sender`, `header`, `nonce`, `cipher` are all hex-encoded
- **`mail.sender`** = hex Ed25519 public key of the sender (so the receiver can perform DH)
- **`mail.header`** = hex ephemeral X25519 public key (so the receiver can derive the same session key)
- **Encryption**: NaCl secretbox (XSalsa20-Poly1305) — authenticated encryption with built-in integrity

## Old spire wire format

Old spire (and the original libvex-js) use a different protocol with sessions, HMAC authentication, and a packed binary `extra` field.

### WebSocket frame structure

All WS messages: `[32-byte header][msgpack body]`

- For **mail messages**: header = `HMAC-SHA256(msgpack(mail), sessionKey)`
- For **control messages** (ping, pong, challenge, etc.): header = all zeros

### Mail object fields (WS.IMail)

| Field | Type | Description |
|-------|------|-------------|
| `mailID` | string | UUID |
| `mailType` | number | `0` = initial (new session), `1` = subsequent (reuses session) |
| `sender` | string | Sender's **deviceID** (UUID), NOT public key |
| `recipient` | string | Recipient's deviceID (UUID) |
| `cipher` | Uint8Array | Encrypted ciphertext (raw bytes) |
| `nonce` | Uint8Array | 24-byte random nonce (raw bytes) |
| `extra` | Uint8Array | Packed crypto material (see below) |
| `group` | Uint8Array \| null | Channel UUID as 16 bytes, or null for DMs |
| `forward` | boolean | Whether this is a forwarded message |
| `authorID` | string | Sender's userID |
| `readerID` | string | Recipient's userID |

### `extra` field structure

**Initial message (mailType = 0)**: 170 bytes total

```
Offset  Size  Content
0       32    Sender's Ed25519 signing public key
32      32    Sender's ephemeral X25519 public key
64      32    Session public key (X25519 pubkey derived from session key)
96      68    Associated Data: xEncode(senderIdentityX25519) || xEncode(recipientIdentityX25519)
164     6     One-Time Key index (big-endian integer, 0 if no OTK)
```

**Subsequent message (mailType = 1)**: 32 bytes

```
Offset  Size  Content
0       32    Session public key (used to look up stored session)
```

### Server storage (Database.saveMail)

Spire's `saveMail` **overwrites** some fields:
- `sender` is replaced with the **sender's deviceID** (from the authenticated WS connection)
- `header` is stored as the **32-byte WS frame header** (HMAC), not any mail body field

### Mail retrieval (POST /device/:id/mail)

Returns msgpack array of tuples: `[[frameHeader, mailObject, timestamp], ...]`

- `tuple[0]` = stored frame header (HMAC bytes, NOT the ephemeral key)
- `tuple[1]` = mail object with `sender` = deviceID, crypto fields as Uint8Array
- `tuple[2]` = Date timestamp

The receiver extracts the sender's signKey and ephemeral key from `extra[0:32]` and `extra[32:64]`.

## Translation strategy (spire-wire.ts)

### Sending: our IMail → spire WS frame

1. Pack `extra` field: embed sender signKey (from `mail.sender`) and ephemeral key (from `mail.header`) into the 170-byte structure. PK/AD/IDX slots filled with zeros (only needed for old client interop which uses a different KDF).
2. Convert `cipher`, `nonce` from hex strings to Uint8Array.
3. Set `sender` to the sender's deviceID (UUID string, not public key).
4. Convert `group` from UUID string to 16-byte Uint8Array.
5. Set `mailType` to `0` (initial — we always use fresh ephemeral keys).
6. Set `forward` to `false` (boolean, not string).
7. Frame header: 32 bytes of zeros (we skip HMAC — the server stores it opaquely and XSalsa20-Poly1305 already provides authentication).

### Receiving: spire wire → our IMail

1. Ignore `tuple[0]` (HMAC frame header — we rely on Poly1305 for authentication).
2. Unpack `extra` field: extract sender signKey from `extra[0:32]` and ephemeral key from `extra[32:64]`.
3. Set `mail.sender` to hex(signKey) and `mail.header` to hex(ephemeralKey).
4. Convert `cipher`, `nonce` from Uint8Array to hex strings.
5. Convert `group` from Uint8Array to UUID string.
6. Pass to `SessionManager.decrypt()`.

### Why old desktop clients can't decrypt our messages (and vice versa)

The KDF parameters differ:
- **Old**: `futoin-hkdf` with SHA-512, salt = `0xFF * 32`, info = `"xchat"`
- **New**: `@noble/hashes` HKDF with SHA-256, no salt, no info

Even with identical DH inputs, the derived session keys will differ. This is acceptable — the mobile client is the primary client going forward.

## Device connect flow (for mail retrieval)

Old spire's `POST /device/:id/mail` requires a device JWT (separate from the user auth JWT):

1. `GET /token/connect` → action token `{ key: UUID, time, scope }`
2. Sign `uuidParse(key)` with device signing key: `nacl.sign(tokenBytes, deviceKey)`
3. `POST /device/:id/connect` with `{ signed: signedBytes }` (msgpack body)
4. Server verifies signature against device's registered public key
5. Server returns device JWT (also set as cookie)
6. Client sends JWT as `X-Device-Token` header on device-level endpoints
