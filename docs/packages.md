# Packages Layer

Canonical reference for `packages/*` — the shared TypeScript libraries that power all Vex clients.

---

## Overview

Three packages bridge the server protocol and all client platforms (desktop, mobile, third-party developers):

| Package | npm name | Purpose |
|---|---|---|
| `packages/types` | `@vex-chat/types` | Shared protocol interfaces — no runtime deps, no build step |
| `packages/crypto` | `@vex-chat/crypto` | NaCl signing, hex encoding, X3DH session crypto |
| `packages/libvex` | `@vex-chat/libvex` | Framework-agnostic client SDK |

All three are `private: true` workspace packages. They are consumed by other packages and apps via `"workspace:*"` deps in `pnpm-workspace.yaml`.

---

## `packages/types` — `@vex-chat/types`

**No runtime dependencies. No build step. Source-first.**

TypeScript interfaces only — the wire format contract between server and clients. Consuming packages import directly from `./src/index.ts` via the `exports` field.

### Files

```
packages/types/src/
  index.ts      — barrel export
  user.ts       — IUser, IRegistrationPayload, ILoginBody
  device.ts     — IDevice, IDevicePayload, IKeyBundle, IPreKey, IOneTimeKey
  mail.ts       — IMail (wire format: nonce, cipher, header, mailType, …)
  server.ts     — IServer, IChannel, IPermission, IInvite
  token.ts      — TokenType, ALL_TOKEN_TYPES, IActionToken, ITokenStore
```

### Design rules

- **No Kysely-specific fields.** `deleted: number` stays in spire's `src/db/types.ts`, not here.
- **No classes, no enums at runtime.** Use `const` objects + `as const` for enum-like values so tree-shaking works.
- **No Zod schemas here.** Spire owns its own Zod schemas in `*.schemas.ts` files. These interfaces are the inferred shape.

### `package.json` shape

```json
{
  "name": "@vex-chat/types",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

---

## `packages/crypto` — `@vex-chat/crypto`

**Dependency on `tweetnacl` always. `ed2curve` + `futoin-hkdf` only for `session.ts`.**

Extracted from `apps/spire/src/auth/auth.crypto.ts` (hex encoding, NaCl signature verify) and extended with client-side primitives (signing, X3DH session setup).

### Files

```
packages/crypto/src/
  index.ts       — barrel export
  encoding.ts    — decodeHex, encodeHex
  nacl.ts        — verifyNaClSignature, verifyDetached
                   signMessage, signDetached, generateSignKeyPair
  session.ts     — ed2curve conversions, HKDF key derivation (X3DH)
```

### What lives where

| Function | File | Used by |
|---|---|---|
| `decodeHex` / `encodeHex` | `encoding.ts` | spire, libvex |
| `verifyNaClSignature` | `nacl.ts` | spire (auth routes) |
| `verifyDetached` | `nacl.ts` | spire (ws handshake) |
| `signMessage` / `signDetached` | `nacl.ts` | libvex |
| `generateSignKeyPair` | `nacl.ts` | libvex |
| `convertPublicKey` / `convertSecretKey` / `convertKeyPair` | `session.ts` | libvex only |
| `generateDHKeyPair` / `dh` | `session.ts` | libvex only |
| `deriveSessionKey` (HKDF-SHA256) | `session.ts` | libvex only |

**Stays in spire only:** `hashPassword` / `verifyPassword` (argon2id, server-only).

### Library rationale

| Old | New | Why |
|---|---|---|
| `tweetnacl` (CJS, 6yr old) | `@noble/curves/ed25519` | ESM-native, Cure53 audited Sept 2024, 9.7M weekly downloads |
| `ed2curve` (CJS UMD, broken named exports in ESM) | `ed25519.utils.toMontgomery` / `toMontgomerySecret` | Built into `@noble/curves` — no separate package |
| `futoin-hkdf` (CJS) | `@noble/hashes/hkdf` | ESM-native, zero deps, 29.9M weekly downloads |

### `package.json` shape

```json
{
  "name": "@vex-chat/crypto",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@noble/curves": "catalog:",
    "@noble/hashes": "catalog:"
  }
}
```

---

## `packages/libvex` — `@vex-chat/libvex`

**Framework-agnostic client SDK.** Uses native `fetch`, `eventemitter3` (typed events), `reconnecting-websocket`.

### DX Design Principles

#### 1. Typed events via EventEmitter3 generics

```ts
interface VexEvents {
  ready:        () => void
  authed:       (user: IUser) => void
  mail:         (mail: IMail) => void
  serverChange: (server: IServer) => void
  close:        () => void
  error:        (err: Error) => void
}

class VexClient extends EventEmitter<VexEvents> { ... }
// client.on('mail', (mail) => ...)  — mail is typed IMail, no cast needed
```

#### 2. Async iterator API — alongside EventEmitter

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

#### 3. Discriminated union errors

```ts
type SendResult =
  | { ok: true;  mail: IMail }
  | { ok: false; code: 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'NETWORK_ERROR'; message: string }

const result = await client.sendMail(payload)
if (!result.ok) switch (result.code) { ... }
```

#### 4. Sub-path export `/bot`

```ts
import { CommandRouter } from '@vex-chat/libvex/bot'
const router = new CommandRouter(client)
router.on('!ping', async (mail) => client.replyTo(mail, 'pong'))
```

#### 5. TSDoc on all public methods

For IntelliSense and generated API documentation.

### Files

```
packages/libvex/src/
  index.ts         — barrel: VexClient, VexEvents, error types, helpers
  client.ts        — VexClient class (extends EventEmitter<VexEvents>)
  connection.ts    — VexConnection: reconnecting-websocket + NaCl challenge handshake
  auth.ts          — register(), login(), logout(), whoami(), getToken()
  mail.ts          — sendMail(), fetchInbox(), mail() async iterator
  devices.ts       — listDevices(), fetchKeyBundle()
  servers.ts       — createServer(), listServers(), createChannel()
  http.ts          — typed fetch wrapper: get/post/delete
  iterators.ts     — fromEvent(): EventEmitter → AsyncIterable
  errors.ts        — VexError discriminated union, error factory
  bot/
    index.ts       — CommandRouter, replyTo() helper
    router.ts      — CommandRouter: routes mail to handlers by prefix
```

### VexClient public API

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

  // Mail
  async sendMail(payload: IMail): Promise<SendResult>
  async fetchInbox(deviceID: string): Promise<IMail[]>
  mail(): AsyncIterable<IMail>         // real-time stream

  // Devices
  async listDevices(userID: string): Promise<IDevice[]>
  async fetchKeyBundle(deviceID: string): Promise<IKeyBundle>

  // Servers
  async createServer(name: string): Promise<IServer>
  async listServers(): Promise<IServer[]>
  async createChannel(serverID: string, name: string): Promise<IChannel>

  // Key utils
  static generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array }
}
```

### `package.json` shape

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

## TypeScript Resolution

- **Root tsconfig:** `"module": "nodenext"` — reads `package.json#exports`
- **Each package:** `"exports": { ".": "./src/index.ts" }` + `allowImportingTsExtensions: true`
- **pnpm `workspace:*`** creates symlinks → no extra `tsconfig.json` `paths` entries needed in consuming apps

---

## Dependency Graph

```
apps/spire ──────────────────────── @vex-chat/crypto
                                          │
packages/libvex ─┬── @vex-chat/types ◄───┘
                 └── @vex-chat/crypto
```

`packages/types` has zero runtime deps. `packages/crypto` depends only on `tweetnacl` (always) and `ed2curve` + `futoin-hkdf` (session crypto only). `packages/libvex` depends on both packages plus `eventemitter3` and `reconnecting-websocket`.

---

## What Changes in `apps/spire`

Only 3 files change. Everything else (routes, services, Zod schemas, DB types, migrations, JWT, tests) is untouched.

| File | Change |
|---|---|
| `src/auth/auth.crypto.ts` | Import `decodeHex`, `encodeHex`, `verifyNaClSignature` from `@vex-chat/crypto`; delete those implementations |
| `src/ws/ws.service.ts` | Replace `nacl.sign.detached.verify(...)` with `verifyDetached(...)` from `@vex-chat/crypto` |
| `package.json` | Add `"@vex-chat/crypto": "workspace:*"` to dependencies |

`hashPassword` / `verifyPassword` stay in spire — they use `argon2id`, which is server-only.

---

## Verification Checklist

```bash
pnpm --filter @vex-chat/spire test    # 255 green
pnpm --filter @vex-chat/spire lint    # clean
pnpm -r exec tsc --noEmit            # zero errors across workspace
```
