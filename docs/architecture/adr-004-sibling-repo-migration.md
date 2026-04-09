# ADR-004: Migrate to Sibling Repos via Platform Adapter Injection + Mobile Expo Prebuild

**Status:** Proposed (draft)
**Date:** 2026-04-05
**Deciders:** @dream
**Supersedes:** None (supplements ADR-001)
**Related:** ADR-001 (monorepo consolidation), ADR-003 (thin-shell apps)

---

## Context

The vex-chat monorepo currently contains workspace-internal copies of `@vex-chat/libvex`, `@vex-chat/crypto`, `@vex-chat/types` under `packages/`. These were a clean-room rewrite on `@noble/*` crypto libraries, with ESM + hex-string wire formats and a proposed `SessionManager`/`DecryptedMail`/`KeyStore` architecture.

Meanwhile, the canonical standalone sibling repos (`libvex-js`, `crypto-js`, `types-js`, `spire`) have been independently modernized (all now merged to `master`). Reading them today reveals that they are **further along than the monorepo rewrite**, with a different architectural direction:

**`libvex-js@master`** (v1.0.0-rc.0, TS 6, pure ESM, Vitest):
- Monolithic 3172-line `Client` class with full protocol implementation
- Event-driven architecture (9 events: `ready`, `connected`, `message`, `session`, `permission`, etc.)
- `IStorage` interface with SQLite+Kysely implementation
- 359-line integration test suite covering register → login → connect → messaging → files
- Hardcoded `import WebSocket from "ws"` and Winston logger — needs adapter injection for browser/RN
- An earlier `feat/platform-adapters` prototype was validated and deleted; the pattern will be recreated fresh from master

**`crypto-js@master`** (v1.1.0-rc.1, TS 6, pure ESM, Vitest):
- Monolithic `src/index.ts` (473 LOC) unchanged
- Still tweetnacl + ed2curve + msgpackr + bip39; no `@noble/*` dependencies
- Uses `node:crypto` (`createHash`/`createHmac`/`hkdfSync`/`pbkdf2Sync`/`randomBytes`) — blocks browser/RN
- Uses `node:fs` (`writeFileSync`/`readFileSync`) in `saveKeyFile`/`loadKeyFile`
- msgpackr config: `moreTypes: true → false` (spec compliance)
- 14 test files (359 LOC) migrated to Vitest

**`types-js@master`** (v1.0.0-rc.1, pure ESM, TS 6):
- Single `src/index.ts` (263 LOC), 34 exports unchanged

**`spire@master`** (v0.9.0-rc.0, private, TS 6, Vitest):
- Runs TypeScript natively via Node 24's `--experimental-strip-types` — no build step for local dev
- Wire protocol unchanged: 32-byte header + msgpack body; 170-byte packed `extra` field `[signKey|ephKey|reserved|AD|otkIdx]`
- All crypto fields stay `Uint8Array`; hex-encoded only in the DB

**Decision:** Adopt the sibling repos as the source of truth. Add adapter injection to libvex-js and browser-compatible crypto to crypto-js on a single `feat/platform-adapters` branch across all repos. Migrate vex-chat to consume the siblings via **pnpm workspace** (adding sibling dirs to `pnpm-workspace.yaml`). In the same sweep, migrate `apps/mobile` from bare RN to **Expo Prebuild (CNG)**.

---

## What the Monorepo Rewrite Got Wrong (and what to keep)

The monorepo's `packages/libvex`/`packages/crypto`/`packages/types` rewrite proposed:
- A standalone `SessionManager` class (extracted from `Client.readMail`/`createSession`)
- A `DecryptedMail` event separate from `IMessage`
- A `KeyStore` interface narrower than `IStorage`
- A `box.ts` primitive layer + `computeFingerprint` + SHA-256 HKDF `deriveSessionKey` + public Ed25519 sign/verify in crypto
- Hex-string wire format with a `spire-wire.ts` adapter translating to spire's Uint8Array format

**None of these are being built in the sibling repos.** The direction instead is:

| Concern | Sibling-repo direction |
|---|---|
| SDK portability | **Runtime adapter injection** — `Client.create(pk, { adapters })` — not architectural rewrite |
| Platform differences | Dynamic imports gated by `exports` conditions (`node`/`browser`/`react-native`) — not separate classes |
| Decryption ownership | **Already inside `Client.readMail`** — no extraction needed |
| Mail event shape | `"message"` event with `IMessage { decrypted: boolean, ... }` — stays as-is |
| Crypto primitives | Existing `xDH`/`xHMAC`/`xKDF`/`XUtils` surface stays stable — but internal Node API calls must be swapped for pure-JS equivalents (see Phase A.5) |
| Wire format | Uint8Array + 170-byte packed extra — matches spire natively, no adapter needed |
| Persistence abstraction | `IStorage` interface — inject SQLite backend per platform (tauri-plugin-sql, expo-sqlite, better-sqlite3) |

The sibling-repo approach is **fewer moving parts, less rewrite risk, and actually ships**. The monorepo `packages/libvex|crypto|types` are deleted.

---

## Packaging Strategy

The sibling repos stay at **4 packages** (`types` + `crypto` + `libvex` + monorepo-only `store`) following a stability gradient:

```
@vex-chat/types      ← most stable (pure interfaces, zero runtime)
    ↓
@vex-chat/crypto     ← stable (primitives, tweetnacl wrappers, @noble/hashes after A.5)
    ↓
@vex-chat/libvex     ← less stable (Client, protocol, adapters, storage)
    ↓
@vex-chat/store      ← app-specific (nanostores atoms — stays in vex-chat monorepo)
```

**Principles:** Stable Dependencies (packages depend only on more stable ones); Acyclic Dependencies (no cycles); Reuse-Release Equivalence (units of reuse = units of release); "premature packaging is the premature abstraction of the module graph."

**No new sibling packages.** Things that might tempt splitting (bot framework, keystore reference impls, platform storage backends, test helpers) are too small and too tightly coupled to warrant independent release cadence. **Use subpath exports within `libvex-js`** instead — the pattern used by Next.js, date-fns, Vitest.

### libvex-js subpath export layout

```
@vex-chat/libvex                      → Client, IStorage, IClientAdapters, IMessage
@vex-chat/libvex/transport/node        → nodeAdapters (ws-backed) — existing
@vex-chat/libvex/transport/browser     → browserAdapters (globalThis.WebSocket)
@vex-chat/libvex/transport/native      → reactNativeAdapters
@vex-chat/libvex/transport/test        → inMemoryAdapters, MockWebSocket, silentLogger — existing
@vex-chat/libvex/storage/node         → SqliteStorage + createNodeStorage (better-sqlite3 + Kysely)
@vex-chat/libvex/storage/memory       → MemoryStorage for tests
(shipped: createExpoStorage (expo-sqlite dialect), createTauriStorage (tauri-plugin-sql dialect))
@vex-chat/libvex/keystore/node        → file-backed KeyStore (Node condition; wraps saveKeyFile)
@vex-chat/libvex/keystore/memory      → in-memory KeyStore for tests
@vex-chat/libvex/bot                  → CommandRouter, fromEvent
```

Bundlers tree-shake unused subpaths. Browser/RN bundles never pull the `node` subpaths because platform conditions in `exports` route them elsewhere.

---

## Identity Persistence Architecture

**Decision:** `Client` does **not** own credential persistence. `KeyStore` is a contract app-level code implements, not an SDK concern.

### Rationale

| Principle | Applied |
|---|---|
| **Single Responsibility** | `Client` = protocol (auth handshake, mail, sessions). Credential persistence = app concern. Different concerns, different lifecycles. |
| **Interface Segregation** | `IClientAdapters { logger, WebSocket }` is cohesive (runtime environment primitives). Adding `KeyStore` mixes stateful persistence with stateless constructors — breaks cohesion. |
| **Security posture** | Identity keys belong in OS keychain (hardware-backed, biometric-gated). Session state belongs in local DB (SQLite). Different backends, MUST NOT share one `IStorage`. |
| **Biometric UX timing** | If `Client.create()` auto-loaded credentials, it would trigger Face ID / biometric prompts at construction — apps lose control over when prompts appear. |
| **Testability** | `Client.create(privateKey: string)` is trivially testable with any hex string. KeyStore injection requires mocks at every test site. |
| **Industry precedent** | matrix-js-sdk, Twilio, Slack, Discord, Stripe all pass credentials as primitives. Only libsignal bundles identity persistence into its Store — and its Store is intentionally broader than what we need. |

### Contract

`KeyStore` + `StoredCredentials` types live in **`@vex-chat/types`** (pure contracts, zero runtime, cross-package consumers):

```ts
// @vex-chat/types/src/keystore.ts
export interface StoredCredentials {
  username: string
  deviceID: string
  deviceKey: string   // hex Ed25519 secret key
  preKey?: string
  token?: string
}
export interface KeyStore {
  load(username?: string): Promise<StoredCredentials | null>
  save(creds: StoredCredentials): Promise<void>
  clear(username: string): Promise<void>
}
```

### Reference implementations shipped by libvex-js

- **`@vex-chat/libvex/keystore/node`** — file-backed, wraps `saveKeyFile`/`loadKeyFile` from `@vex-chat/crypto/node` (Phase A.5 subpath). For bots, CLI tools, integration tests that want to exercise the save/resume code path. Encrypts credentials to disk with PBKDF2-derived key + `nacl.secretbox`.
- **`@vex-chat/libvex/keystore/memory`** — in-memory, ~10 LOC. For unit tests that don't touch disk.

### Who implements KeyStore

| Consumer | KeyStore backing |
|---|---|
| Bots / CLI tools | `nodeKeyStore(path, password)` from `@vex-chat/libvex/keystore/node` |
| Unit tests | `inMemoryKeyStore()` from `@vex-chat/libvex/keystore/memory` |
| Mobile app | App-provided, wraps `react-native-keychain` (already exists at `apps/mobile/src/lib/keychain.ts`) |
| Desktop app (Tauri) | App-provided, wraps Tauri Stronghold or `tauri-plugin-keyring` |
| Browser / website | App-provided (tauri-plugin-sql for Tauri, wa-sqlite for pure browser (future)) |

### Session bootstrap pattern (app-level, not SDK)

```ts
// App composition root — runs at launch
const creds = await keystore.load()

if (creds) {
  // Resume existing session
  const client = await Client.create(creds.deviceKey, { adapters, storage })
  await client.connect()
} else {
  // First launch — show registration UI, then:
  const privateKey = Client.generateSecretKey()
  const client = await Client.create(privateKey, { adapters, storage })
  const result = await client.register(username, password)
  await keystore.save({
    username,
    deviceID: result.deviceID,
    deviceKey: privateKey,
    preKey: client.keyring.preKey,
  })
}
```

The app wires credential loading → `Client.create(privateKey, …)`. `Client` never sees `KeyStore`.

**Optional higher-level helper** (opt-in, doesn't change core API):
```ts
// @vex-chat/libvex exports a thin factory for the common case
export async function resumeSession(
  keystore: KeyStore,
  options: IClientOptions,
): Promise<Client | null> {
  const creds = await keystore.load()
  if (!creds) return null
  return Client.create(creds.deviceKey, options)
}
```

---

## Plan

### Phase A — Prepare sibling repos (DONE)

All work on `feat/platform-adapters` branches, fresh from master.

**A.1 — types-js (DONE):** Added `KeyStore` + `StoredCredentials` interfaces. Split `IUser` into `IUser` (public) + `IUserRecord` (DB, server-only).

**A.2 — crypto-js (DONE):** Replaced `node:crypto` with `@noble/hashes` (sha512, hmac, hkdf, pbkdf2, getRandomValues). Guarded `node:fs` behind dynamic import. All 18 tests pass.

**A.3 — libvex-js (DONE):** Implemented `IClientAdapters` + `ILogger` interfaces, `nodeAdapters()` factory with dynamic `import("ws")`, `inMemoryAdapters()` + `MockWebSocket` test harness. `Client.create()` composition root defaults to `nodeAdapters()`. Moved crypto+types from peer deps to regular deps (discord.js pattern). Re-exports app-facing types. All 12 integration tests pass.

**A.4 — spire (DONE):** Removed yalc, adopted `IUserRecord` for DB operations, deleted `ICensoredUser`. `censorUser()` returns public `IUser`. All 3 tests pass.

**All repos:** Deleted `.yalc/` directories and `yalc.lock` files. Sibling repos use `file:` protocol in devDependencies for standalone npm development. Client repos linked to monorepo via pnpm workspace.

### Phase A.5 — crypto-js pure-JS migration (prerequisite for browser/RN)

**Blocker discovered during Phase B planning:** `crypto-js/src/index.ts` imports `node:crypto` (`createHash`/`createHmac`/`hkdfSync`/`pbkdf2Sync`/`randomBytes`), `node:fs` (`writeFileSync`/`readFileSync`), and uses `Buffer.readUIntBE`/`Buffer.from`. A browser or React Native bundler resolving `@vex-chat/libvex` → `@vex-chat/crypto` will fail at module-load time on these imports, regardless of whether libvex-js itself is injection-clean.

**9 Node API call sites to resolve** (mapped to test impact):

| # | Node API | Location in `src/index.ts` | Test that covers it | Replacement |
|---|---|---|---|---|
| 1 | `createHash("sha512")` | `xHash` | none | `sha512` from `@noble/hashes/sha512` (RFC-6234, byte-identical) |
| 2 | `createHmac("sha256", ...)` | `xHMAC` | `xHMAC.ts` — compares output vs Node's `createHmac` directly | `hmac(sha256, …)` from `@noble/hashes` (RFC-2104 deterministic) |
| 3 | `pbkdf2Sync(…, "sha512")` | `saveKeyFile`/`loadKeyFile` | `keyFileFunctions.ts` (save→load round-trip) | `pbkdf2(sha512, …)` from `@noble/hashes` (RFC-2898 deterministic) |
| 4 | `hkdfSync("sha512", …)` | `xKDF` | none | `hkdf(sha512, …)` from `@noble/hashes` (RFC-5869) |
| 5 | `randomBytes(2)` | `saveKeyFile` iteration count | `keyFileFunctions.ts` (round-trip only, no byte assertion) | `nacl.randomBytes(2)` (already a dep) |
| 6 | `Buffer.from(arr).readUIntBE(0, len)` | `uint8ArrToNumber` | `uint8ArrToNumber.ts` (fixed bytes → fixed ints) | Plain big-endian loop (byte-identical) |
| 7 | `Buffer.from(SK)` | `xHMAC` | indirect | Pass `Uint8Array` directly to `@noble/hashes/hmac` |
| 8 | `Buffer.from(entropy)` | `xMnemonic` | `xMnemonic.ts` (fixed IKM → fixed mnemonic) | `bip39.entropyToMnemonic(XUtils.encodeHex(entropy), wordList)` — bip39 accepts hex strings |
| 9 | `writeFileSync` / `readFileSync` | `saveKeyFile`/`loadKeyFile` | `keyFileFunctions.ts` | No pure-JS replacement — architectural decision (see below) |

**8 commits, each leaves tests green:**

1. Add `@noble/hashes` dependency (pure JS, ~15KB gzipped, tree-shakeable, audited)
2. `xHash`: `createHash` → `sha512` from `@noble/hashes/sha512`
3. `xHMAC`: `createHmac` → `hmac(sha256, …)` from `@noble/hashes`
4. `xKDF`: `hkdfSync` → `hkdf(sha512, …)` from `@noble/hashes`
5. `saveKeyFile`/`loadKeyFile`: `pbkdf2Sync` → `pbkdf2(sha512, …)` from `@noble/hashes`
6. `saveKeyFile`: `randomBytes(2)` → `nacl.randomBytes(2)` (tweetnacl, already a dep)
7. `XUtils.uint8ArrToNumber`: `Buffer.readUIntBE` → pure-JS BE loop (`let n = 0; for (i...) n = n * 256 + arr[i]`)
8. `xMnemonic`: drop `Buffer.from(entropy)`, pass hex string to `bip39.entropyToMnemonic`

**Why each test still passes after the swap:**
- `xHMAC.ts` compares `xHMAC()` output against Node's `createHmac("sha256", …)` directly — HMAC-SHA-256 is RFC-2104 deterministic, `@noble/hashes/hmac` produces byte-identical output
- `keyFileFunctions.ts` is a round-trip test (save→load symmetry); as long as both sides use the same impl, round-trips still work
- `uint8ArrToNumber.ts` feeds fixed byte arrays expecting fixed integers; pure-JS big-endian loop produces same output as `Buffer.readUIntBE`
- `xMnemonic.ts` feeds fixed hex IKM expecting fixed 24-word mnemonic; `bip39` accepts hex strings and decodes internally, identical entropy → identical mnemonic

**Commit 9 — architectural decision for fs I/O.** After commits 1-8, only `writeFileSync`/`readFileSync` inside `saveKeyFile`/`loadKeyFile` remain Node-only. Chosen approach: **split entry points via `node` export condition**:

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "node": "./dist/index.node.js",
    "import": "./dist/index.js",
    "default": "./dist/index.js"
  }
}
```

`./dist/index.node.js` re-exports everything from `index.js` plus `saveKeyFile`/`loadKeyFile`. Browser/RN bundlers resolve `.` to `index.js` (pure JS, no fs); Node resolves to `index.node.js` (full surface). Existing Node consumers keep `import { saveKeyFile } from "@vex-chat/crypto"` unchanged. Test imports unchanged.

**After Phase A.5 completes:**
- crypto-js root entry is pure JS — browser/RN can import `@vex-chat/libvex` → `@vex-chat/crypto` with no Node shim needed
- `@types/node` only required for the `node` subpath
- Existing 14 Vitest test files (359 LOC) stay green throughout

**Salvage ports folded in** (from monorepo `packages/crypto` analysis):
- `computeFingerprint(hexA, hexB) → string` — SHA-256, order-independent, space-separated 4-char hex blocks; uses `@noble/hashes/sha256` now that it's a dep
- Ed25519 public API wrappers: `generateSignKeyPair`, `signDetached`, `verifyDetached`, `derivePublicKey` — tweetnacl-backed (not @noble)

**Optional future commit:** swap `bip39` → `@scure/bip39` (same author as `@noble/*`, Uint8Array-native, drops transitive Buffer polyfill). Separate decision — `xMnemonic.ts` test is a byte-level mnemonic check, passes if entropy → mnemonic mapping stays BIP-39 standard.

### Phase B — Fill the `null` adapter exports in libvex-js (NOT DONE)

**Unblocked by Phase A** — crypto-js is now pure JS, adapter injection scaffold exists.

Adds adapters, storage backends, keystore reference implementations, and the bot subsystem as subpath exports. See "Packaging Strategy" and "Identity Persistence Architecture" sections above for rationale.

**New files:**

| New file | Purpose |
|---|---|
| `src/transport/browser.ts` | `browserAdapters()` → `{ logger: consoleLogger, WebSocket: globalThis.WebSocket }` |
| `src/transport/native.ts` | `reactNativeAdapters()` → `{ logger: rnLogger, WebSocket: globalThis.WebSocket }` |
| `src/storage/memory.ts` | `MemoryStorage` — in-memory `IStorage` for unit tests |
| `src/keystore/node.ts` | `nodeKeyStore(path, password)` — file-backed, wraps `saveKeyFile`/`loadKeyFile` (Node condition only) |
| `src/keystore/memory.ts` | `inMemoryKeyStore()` — for unit tests, ~10 LOC |
| `src/bot/router.ts` | `CommandRouter` — prefix-based mail dispatcher (salvaged from monorepo `packages/libvex/src/bot`) |
| `src/iterators.ts` | `fromEvent` — EventEmitter → AsyncIterable helper (salvaged) |
| `src/deeplink.ts` | `parseVexLink`, `parseInviteID` (salvaged) |
| `src/session.ts` | Optional `resumeSession(keystore, options)` factory helper |

**Added to `@vex-chat/types`:**
- `src/keystore.ts` — `KeyStore` + `StoredCredentials` interfaces (pure types, zero runtime)

Existing `src/Storage.ts` (SQLite + Kysely) stays as the Node default under `@vex-chat/libvex/storage/node`.

**Exports map:**

```json
"exports": {
  ".": {
    "types": "./dist/index.d.ts",
    "import": "./dist/index.js",
    "default": "./dist/index.js"
  },
  "./transport/node": {
    "node": "./dist/transport/node.js"
  },
  "./transport/browser": "./dist/transport/browser.js",
  "./transport/native": "./dist/transport/native.js",
  "./transport/test": "./dist/transport/test.js",
  "./storage/node": {
    "node": "./dist/storage/node.js"
  },
  "./storage/memory": "./dist/storage/memory.js",
  "./keystore/node": {
    "node": "./dist/keystore/node.js"
  },
  "./keystore/memory": "./dist/keystore/memory.js",
  "./bot": "./dist/bot/router.js"
}
```

Node-only subpaths (`/transport/node`, `/storage/node`, `/keystore/node`) use the `node` condition — browser/RN bundlers resolving them would error at import time (correct behavior: these would fail at runtime anyway since they need `ws`/`better-sqlite3`/`fs`).

**Tests to add:**
- Browser adapter wiring (JSDOM env)
- Native adapter wiring (react-native mocks)
- IStorage round-trip tests for memory backend
- `nodeKeyStore` save→load round-trip (uses temp file)
- `inMemoryKeyStore` basic contract tests
- `CommandRouter` prefix-dispatch tests using `inMemoryAdapters` + fake mail stream

### Phase C — Migrate vex-chat to consume the siblings (DONE)

**Step 1 — delete internal packages:**
```
rm -rf packages/libvex packages/crypto packages/types
```

**Step 2 — wire siblings via pnpm workspace:**

Add sibling repos as external workspace members:
```yaml
# vex-chat/pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
  - '../crypto-js'
  - '../types-js'
  - '../libvex-js'
```

Then `pnpm install` from the vex-chat root resolves all `workspace:*` dependencies to sibling directories via symlinks. No publish or push step between edits — changes in sibling source are immediately visible after `npm run build` in the sibling repo.

Spire is **not** included in the pnpm workspace — it's a server, not consumed by the monorepo apps. It runs standalone for local integration testing.

Sibling repos keep their own `package-lock.json` for standalone CI. The pnpm workspace lockfile is only used during local development.

**Step 3 — rewrite consumer imports** (~18 sites across 12 files). The API shape changes:

| Monorepo (old) | Sibling (new) |
|---|---|
| `import { VexClient } from '@vex-chat/libvex'` | `import { Client } from '@vex-chat/libvex'` |
| `VexClient.create(url, keystore)` | `Client.create(privateKey?, options?, storage?)` |
| `client.on('mail', (mail: DecryptedMail) => ...)` | `client.on('message', (msg: IMessage) => ... /* msg.decrypted: boolean */)` |
| `client.sendMail(recipient, content)` | `client.messages.send(userID, text)` |
| `encodeHex(bytes)` / `decodeHex(hex)` | `XUtils.encodeHex(bytes)` / `XUtils.decodeHex(hex)` |
| `parseVexLink(url)` / `parseInviteID(code)` | **Missing — port to libvex-js OR inline in apps** |
| `fromEvent(emitter, name)` | **Missing — port OR inline** |

**Step 4 — wire adapters + storage + keystore per app:**

Apps load credentials from their platform keychain BEFORE calling `Client.create()`. Client never sees the keystore (see "Identity Persistence Architecture" above).

```ts
// apps/mobile/src/lib/keychain.ts — app-provided KeyStore impl
import type { KeyStore } from '@vex-chat/types'
import * as Keychain from 'react-native-keychain'

export const keychainKeyStore: KeyStore = {
  async load() { /* Keychain.getGenericPassword(...) → StoredCredentials */ },
  async save(creds) { /* Keychain.setGenericPassword(...) */ },
  async clear() { /* Keychain.resetGenericPassword(...) */ },
}
```

```ts
// apps/mobile/App.tsx — session bootstrap
import { Client } from '@vex-chat/libvex'
import { reactNativeAdapters } from '@vex-chat/libvex/transport/native'
import { MemoryStorage } from '@vex-chat/libvex/storage/memory'
import { keychainKeyStore } from './lib/keychain'

const adapters = await reactNativeAdapters()
const storage = createExpoStorage()  // SqliteStorage with expo-sqlite Kysely dialect
const creds = await keychainKeyStore.load()

const client = creds
  ? await Client.create(creds.deviceKey, { adapters, storage })
  : null  // show login/register UI
```

```ts
// apps/desktop/src/lib/stronghold-keystore.ts (Tauri)
import type { KeyStore } from '@vex-chat/types'
import { Stronghold } from '@tauri-apps/plugin-stronghold'
export const strongholdKeyStore: KeyStore = { /* Tauri Stronghold-backed */ }

// apps/desktop/src/lib/client.ts
import { Client } from '@vex-chat/libvex'
import { browserAdapters } from '@vex-chat/libvex/transport/browser'
import { MemoryStorage } from '@vex-chat/libvex/storage/memory'
import { strongholdKeyStore } from './stronghold-keystore'

const creds = await strongholdKeyStore.load()
const client = creds
  ? await Client.create(creds.deviceKey, {
      adapters: await browserAdapters(),
      storage: createTauriStorage(),  // SqliteStorage with tauri-plugin-sql Kysely dialect
    })
  : null
```

**Bot example** (shows node keystore usage):
```ts
// my-vex-bot/index.ts
import { Client } from '@vex-chat/libvex'
import { nodeKeyStore } from '@vex-chat/libvex/keystore/node'
import { CommandRouter } from '@vex-chat/libvex/bot'

const keystore = nodeKeyStore('./bot.keyfile', process.env.KEYFILE_PASSWORD!)
const creds = await keystore.load()
if (!creds) throw new Error('Run register script first')

const client = await Client.create(creds.deviceKey)
await client.login(creds.username, process.env.BOT_PASSWORD!)
await client.connect()

const router = new CommandRouter(client, '!')
router.on('ping', (msg) => client.messages.send(msg.authorID, 'pong'))
router.listen()
```

**Step 5 — port the small utility helpers** missing from legacy libvex-js:
- `parseVexLink` / `parseInviteID` — add as new exports in libvex-js (additive, low-risk)
- `fromEvent` — small enough to inline in apps

**Step 6 — verify:** `pnpm -r typecheck`, desktop Vite build, mobile Metro bundle, live smoke test against local spire.

### Phase D — Mobile Expo Prebuild (DONE)

Migrated `apps/mobile` from bare RN 0.84.1 to **Expo SDK 55 Prebuild (CNG)** with RN 0.83.2.

**Key decisions:**
- **Downgraded RN 0.84.1 → 0.83.2** to use Expo SDK 55 stable. No stable Expo SDK supports 0.84 (SDK 56 with RN 0.85 expected May/June 2026).
- **Replaced `react-native-keychain` with `expo-secure-store`** — uses iOS Keychain and Android Keystore under the hood, has built-in Expo config plugin.
- **`@notifee/react-native`** kept with its built-in Expo plugin. Consider `@evennit/notifee-expo-plugin` for iOS Notification Service Extension when needed.
- **`ios/` and `android/` are gitignored** — generated by `npx expo prebuild --clean`.

**Upgrade path:** When Expo SDK 56 goes stable (May/June 2026), upgrade to RN 0.85 + SDK 56 to regain Hermes v1 as default engine.

### Phase E — Docs & bootstrap tooling (NOT DONE)

1. Update `docs/explanation/platform-strategy.md` — replace monorepo-internal `packages/*` references with sibling-repo consumption via adapter injection
2. Add `scripts/bootstrap.sh` to vex-chat that checks for `../libvex-js`, `../crypto-js`, `../types-js` siblings and clones them from GitHub if missing, then runs `pnpm install`. Optionally clone `../spire` for local integration testing.
3. Update root `README.md` with fresh-clone instructions (clone all 5 repos, `pnpm install` from vex-chat root)
4. Mark `packages/ui` and `packages/store` as the only remaining monorepo packages

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Consumer rewrite scope (~18 import sites, API shape changes) | Alternative: add a thin `VexClient` facade in libvex-js that preserves monorepo API shape. More libvex-js work, less consumer churn. Decide per open question #1. |
| pnpm workspace lockfile contains `../` paths (non-portable) | Keep `pnpm-workspace.yaml` sibling entries on `feat/platform-adapters` branch only. Once sibling repos are published to npm, switch to registry versions and remove external workspace entries. |
| Missing utility helpers (`parseVexLink`, `parseInviteID`) | Port as additive exports to libvex-js; small, low-risk, matches existing export style |
| SQLite backend for Tauri WebView | tauri-plugin-sql provides native SQLite access from the WebView via Tauri commands |
| RN downgraded for Expo compat | Downgraded 0.84.1→0.83.2 for SDK 55. Upgrade to SDK 56 + RN 0.85 when stable (May/June 2026). |
| Two-pass bootstrap for fresh clones (need 4 sibling repos) | `scripts/bootstrap.sh` clones missing siblings from GitHub |
| Live API integration tests in libvex-js hit `api.vex.wtf` | Unchanged — run manually or against local spire |
| `@noble/hashes` output drifts from Node's `node:crypto` | Spec-defined primitives (SHA-512, HMAC-SHA-256, HKDF, PBKDF2) — both libs pass NIST/RFC test vectors. `xHMAC.ts` test literally cross-checks against Node's `createHmac` and guards this. Run full test suite after each commit. |
| bip39 transitive `Buffer` polyfill in browser bundles | Bundlers inject it automatically (~4KB). Optional later swap to `@scure/bip39` removes the polyfill need. |
| Existing Node consumers of `saveKeyFile`/`loadKeyFile` break on fs subpath split | Use `node` export condition (not subpath rename) — `import { saveKeyFile } from "@vex-chat/crypto"` resolves to `index.node.js` in Node unchanged. |

---

## Consequences

### Positive

- Sibling repos are the single source of truth; no dual implementations
- Adapter injection pattern is **simpler than SessionManager extraction** — one interface, three factories, zero architecture rewrite
- libvex-js's existing 2,948 LOC `Client` class stays untouched and passes its existing integration test
- crypto-js becomes pure JS at the root entry — runs in browser, React Native, and Node without shims or polyfills (bip39's Buffer polyfill aside)
- Tweetnacl stays for primitives that are already browser-safe (`nacl.secretbox`, `nacl.sign`, `nacl.randomBytes`); `@noble/hashes` replaces only `node:crypto` call sites
- Platform-specific storage backends are discoverable in libvex-js subpath exports
- Bundlers tree-shake unused adapters via `exports` conditions
- spire runs TypeScript natively — fast dev loop, no build step
- Monorepo shrinks to only app-specific + genuinely shared code (`packages/store`, `packages/ui`)

### Negative

- vex-chat consumers rewrite to match legacy `Client` API shape (or we add a facade layer)
- pnpm workspace lockfile contains relative `../` paths — non-portable until sibling repos are published
- Fresh clones need 4 sibling repos + bootstrap script
- Mobile RN version likely pins back to Expo SDK baseline
- Loses the clean-room hex wire format (but it was never needed — spire speaks Uint8Array natively)
- crypto-js gains `@noble/hashes` as a dependency (~15KB gzipped; unavoidable for browser/RN portability)
- crypto-js's `saveKeyFile`/`loadKeyFile` live behind a `node` export condition — browser/RN bundles won't include them

---

## Open Questions

1. **API facade vs consumer rewrite** — Add a thin `VexClient` wrapper in libvex-js that exposes the monorepo's old API shape (`client.sendMail`, `client.on('mail', DecryptedMail)`) on top of `Client`? Keeps vex-chat consumers stable; costs ~200 LOC in libvex-js. OR rewrite ~18 consumer import sites to match legacy `Client` directly?

2. **Expo SDK upgrade** — Upgrade from SDK 55 (RN 0.83) to SDK 56 (RN 0.85) when stable. Regains Hermes v1 as default engine.

3. **Bootstrap UX** — pnpm workspace dev loop needs documentation. Consider a single-command `./scripts/dev.sh` in vex-chat that clones missing siblings, runs `pnpm install`, starts spire, and runs `pnpm -r --parallel dev`.

4. **KeyStore types location** — place `KeyStore` + `StoredCredentials` in `@vex-chat/types` (current plan, cross-package contract) OR in `@vex-chat/libvex` (tighter coupling to the SDK that uses them)? Recommend `@vex-chat/types`.

5. **`resumeSession` helper** — ship in libvex-js main export as a convenience, OR leave composition entirely to apps? Cost is ~10 LOC for the helper; benefit is consistent session-resume pattern.

### Resolved by ADR

- **Linkage mechanism** — pnpm workspace. Add client sibling repos to `pnpm-workspace.yaml` as external members (`'../crypto-js'`, `'../types-js'`, `'../libvex-js'`). Spire is not workspace-linked (server, not consumed by apps). No yalc. `pnpm install` from vex-chat root resolves all inter-repo deps via symlinks. Switch to npm registry versions once stable.
- **Feature branch strategy** — single `feat/platform-adapters` branch from master across all repos that need changes. No reuse of prior prototype branches.
- **Storage backends** — `SqliteStorage` (platform-agnostic, accepts `Kysely<DB>`) + `MemoryStorage` live in libvex-js as subpath exports (`/storage/{node,memory}`). Platform-specific Kysely dialects (better-sqlite3, expo-sqlite, tauri-plugin-sql) are injected at construction time.
- **Utility helpers** — `parseVexLink`/`parseInviteID`/`fromEvent` as additive libvex-js exports. Matches existing export convention.
- **KeyStore ownership** — app-level, not SDK-level. `Client` never sees `KeyStore`. Apps load credentials and pass `privateKey` to `Client.create()`.
- **New packages** — none. 4 packages stays. Subpath exports for all adapter/storage/keystore/bot/test families.
