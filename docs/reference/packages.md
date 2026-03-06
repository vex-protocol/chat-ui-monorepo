# Packages Layer

Canonical reference for `packages/*` — the shared TypeScript libraries that power all Vex clients.

---

## Overview

Five packages form the shared layer consumed by all Vex clients (desktop, mobile, third-party developers):

| Package | npm name | Purpose | Detail |
|---|---|---|---|
| `packages/types` | `@vex-chat/types` | Shared protocol interfaces — no runtime deps, no build step | Below |
| `packages/crypto` | `@vex-chat/crypto` | NaCl signing, hex encoding, X3DH session crypto | Below |
| `packages/libvex` | `@vex-chat/libvex` | Framework-agnostic client SDK (fetch + WebSocket) | [packages-libvex.md](packages-libvex.md) |
| `packages/store` | `@vex-chat/store` | nanostores atoms: state slices + bootstrap + VexClient event wiring | [packages-store-ui.md](packages-store-ui.md) |
| `packages/ui` | `@vex-chat/ui` | Mitosis design primitives compiled to Svelte + React | [packages-store-ui.md](packages-store-ui.md) |

All are `private: true` workspace packages consumed via `"workspace:*"` deps in `pnpm-workspace.yaml`.

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
  mail.ts       — IMail (wire format — internal to libvex, never exposed to apps)
                  DecryptedMail (what apps see: mailID, authorID, readerID, group,
                                 mailType, time, content: string, extra, forward)
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

**Dependency on `@noble/curves` + `@noble/hashes` always. `@noble/ciphers` only for `box.ts`.**

Extracted from `apps/spire/src/auth/auth.crypto.ts` (hex encoding, NaCl signature verify) and extended with client-side primitives (signing, X3DH session setup, authenticated encryption).

### Files

```
packages/crypto/src/
  index.ts       — barrel export
  encoding.ts    — decodeHex, encodeHex
  nacl.ts        — verifyNaClSignature, verifyDetached
                   signMessage, signDetached, generateSignKeyPair
  session.ts     — ed25519↔x25519 conversions, generateDHKeyPair, dh(), deriveSessionKey (HKDF-SHA256)
  box.ts         — encryptBox, decryptBox (X25519 + XSalsa20-Poly1305, NaCl box semantics)
                   encryptSecretBox, decryptSecretBox (symmetric, NaCl secretbox semantics)
                   generateNonce() — 24 random bytes
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
| `encryptBox` / `decryptBox` | `box.ts` | libvex only |
| `encryptSecretBox` / `decryptSecretBox` | `box.ts` | libvex only |
| `generateNonce` | `box.ts` | libvex only |

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

## Dependency Graph

```
packages/types  ◄──────────────────────────────────────────────────┐
packages/crypto ◄────────────────────────────────────────┐         │
                                                          │         │
packages/libvex ─────── @vex-chat/types ◄────────────────┘         │
                └─────── @vex-chat/crypto                           │
                                                                    │
packages/store ──────── @vex-chat/types + @vex-chat/libvex         │
                                                                    │
packages/ui     ─────── (no runtime deps)                           │
                                                                    │
apps/spire ─────────────────────────────── @vex-chat/crypto         │
                                                                    │
apps/desktop ─┬── @vex-chat/store  (atoms are native Svelte stores) │
              └── @vex-chat/ui (/svelte/*)                          │
                                                                    │
apps/mobile  ─┬── @vex-chat/store + @nanostores/react              │
              └── @vex-chat/ui (/react/*)              ◄────────────┘
```

- `packages/types` — zero runtime deps
- `packages/crypto` — `@noble/curves` + `@noble/hashes` only; no Node.js `Buffer` dependency
- `packages/libvex` — types + crypto + `eventemitter3` + `reconnecting-websocket`
- `packages/store` — types + libvex + `nanostores`; apps/mobile optionally installs `@nanostores/react`; Svelte needs no adapter
- `packages/ui` — no runtime deps; Mitosis is a devDep only
- `apps/spire` — imports `@vex-chat/crypto` only (server has no state management needs)

---

## TypeScript Resolution

- **Root tsconfig:** `"module": "nodenext"` — reads `package.json#exports`
- **Each package:** `"exports": { ".": "./src/index.ts" }` + `allowImportingTsExtensions: true`
- **pnpm `workspace:*`** creates symlinks — no extra `tsconfig.json` `paths` entries needed in consuming apps

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

---

See also: [packages-libvex.md](packages-libvex.md) for the VexClient SDK API, [packages-store-ui.md](packages-store-ui.md) for the state layer and design system.
