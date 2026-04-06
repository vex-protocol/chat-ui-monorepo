# ADR-005: Rust WASM for the Crypto Layer

**Status:** Exploration (draft)
**Date:** 2026-04-05
**Deciders:** @dgill
**Related:** ADR-004 (sibling-repo migration, Phase A.5)

---

## Context

ADR-004 Phase A.5 plans to migrate `crypto-js` off `node:crypto` by replacing 8 call sites with `@noble/hashes` equivalents. This makes crypto-js pure JS — runnable in browser and React Native.

A more ambitious alternative exists: **replace crypto-js entirely with a Rust crate compiled to WebAssembly**, producing a single `.wasm` binary that runs identically on Node (native WASM), browsers (native WASM), and React Native (Hermes v1 native WASM).

### Why this is viable now

**Hermes v1 ships native WebAssembly support.** React Native 0.84 (February 2026) includes Hermes v1 by default with `WebAssembly.instantiate()` available in the JS runtime. **vex-chat's mobile app is already on RN 0.84.1** — the WASM path is available today.

| Runtime | WASM support |
|---|---|
| Node.js 24 | Native (V8), production-grade |
| Browsers (Chrome/Safari/Firefox) | Native, since 2017 |
| Hermes v1 (RN 0.84+) | Native, new as of Feb 2026 |
| Expo SDK 55 (RN 0.83) | Not yet — need SDK 56 or manual RN upgrade |
| Expo SDK 56 (expected RN 0.84) | Will include Hermes v1 |

**Fallback options for older runtimes:**
- **Polygen** (Callstack) — compiles `.wasm` → C at build time, runs as native module. iOS only for now.
- **wasm2js** (Binaryen) — compiles `.wasm` → pure JS. Works everywhere but loses performance.
- **react-native-webassembly** — C++ TurboModule wrapping Wasm3 runtime. Expo-compatible with `npx expo prebuild`.

---

## Which Layer Should Be Rust?

### Option A: Rust crypto only (recommended)

Replace `@vex-chat/crypto` (currently 473 LOC JS) with a Rust crate compiled to WASM.

**What moves to Rust:**

| Current JS (crypto-js) | Rust crate equivalent | Rust crate |
|---|---|---|
| `xDH` (X25519 via `nacl.box.before`) | X25519 ECDH | `x25519-dalek` |
| `xKDF` (HKDF-SHA512 via `node:crypto`) | HKDF-SHA512 | `hkdf` + `sha2` |
| `xHMAC` (HMAC-SHA256 via `node:crypto`) | HMAC-SHA256 | `hmac` + `sha2` |
| `xHash` (SHA-512 via `node:crypto`) | SHA-512 | `sha2` |
| `xMakeNonce` (24-byte random via `nacl.randomBytes`) | Cryptographic RNG | `getrandom` (WASM-compatible) |
| `XKeyConvert` (Ed25519 ↔ X25519 via `ed2curve`) | Key conversion | `curve25519-dalek` |
| `nacl.sign` / `nacl.sign.detached` (used in libvex-js) | Ed25519 sign/verify | `ed25519-dalek` |
| `nacl.secretbox` (XSalsa20-Poly1305, used in libvex-js + keyfiles) | AEAD | `xsalsa20poly1305` (RustCrypto) |
| `XUtils.encodeHex` / `decodeHex` | Hex encoding | `hex` |
| `pbkdf2Sync` (keyfile encryption via `node:crypto`) | PBKDF2-SHA512 | `pbkdf2` + `sha2` |
| `bip39.entropyToMnemonic` | BIP-39 mnemonics | `bip39` |
| `msgpackr.pack` / `unpack` (message serialization) | MessagePack | `rmp-serde` |

**What stays in JS:**
- `saveKeyFile` / `loadKeyFile` — filesystem I/O, stays in Node-only JS wrapper
- `XUtils.packMessage` / `unpackMessage` — could move to Rust but low value
- `XUtils.bytesEqual` — trivial, leave in JS

**Estimated Rust crate size:** ~300-500 lines of Rust (plus `Cargo.toml` deps). Smaller than the current 473 LOC JS because Rust crate ecosystem handles more out of the box.

**Why crypto is the right layer:**
- **Small, well-scoped** — the entire API is ~20 exported functions, all pure computation
- **No I/O, no platform concerns** — just bytes in, bytes out
- **This is what Signal does** — libsignal's crypto core is Rust, protocol shell is per-platform
- **Audit boundary** — crypto is the part you want independently audited; a small Rust crate is easier to audit than JS + tweetnacl + ed2curve + @noble/hashes
- **Constant-time guarantees** — Rust's `subtle` crate provides ct comparison; JS has no reliable constant-time primitives
- **One binary, all platforms** — same `.wasm` runs in Node, browser, Hermes
- **Eliminates Phase A.5 entirely** — no need to migrate `node:crypto` → `@noble/hashes` if the whole crypto layer is WASM

### Option B: Rust libvex (not recommended yet)

Replace `@vex-chat/libvex` Client (2,948 LOC) with Rust.

**Problems:**
- Client has WebSocket, HTTP, EventEmitter, IStorage, IClientAdapters — all platform-specific I/O that would need FFI bridges
- WASM can't do network I/O directly — would need JS callbacks for every HTTP request and WS frame
- The adapter injection pattern (Phase B of ADR-004) already solves platform portability for libvex in pure JS
- FFI surface for a 3K LOC class with 50+ methods is huge — more binding code than business logic
- Matrix went full Rust SDK and it took years with a large team

**When it would make sense:**
- If vex adds iOS/Android native apps (SwiftUI/Compose) alongside RN — then Rust SDK + UniFFI bindings avoids reimplementing the protocol per platform
- If the protocol grows significantly (timeline sync, room state, key backup, cross-signing) — more protocol logic justifies a Rust core
- Not today. The 2,948 LOC Client is stable, tested, and works.

### Option C: Rust crypto + Rust protocol core, JS shell (future)

The Signal/Matrix end-state: Rust handles crypto + protocol (sessions, key exchange, mail encrypt/decrypt), JS handles I/O (WebSocket, HTTP, storage via callbacks).

**What moves to Rust (beyond crypto):**
- `SessionManager` / X3DH logic (currently inline in `Client.readMail` / `createSession`)
- Mail encryption/decryption (`nacl.secretbox.open` calls)
- Session record management (in-memory session cache)
- HMAC verification of incoming mail

**What stays in JS:**
- WebSocket connection + reconnection
- HTTP client (auth, server/channel CRUD)
- Event emission (`"message"`, `"connected"`, etc.)
- IStorage / IClientAdapters / KeyStore orchestration

**This is a future evolution** — do Option A first, then extract protocol logic into the Rust crate incrementally.

---

## Architecture: Rust Crypto Crate

### Crate structure

```
vex-crypto/
  Cargo.toml
  src/
    lib.rs            — top-level exports
    dh.rs             — X25519 ECDH (x25519-dalek)
    sign.rs           — Ed25519 sign/verify (ed25519-dalek)
    keys.rs           — key generation, ed25519↔x25519 conversion
    aead.rs           — XSalsa20-Poly1305 secretbox (encrypt/decrypt)
    kdf.rs            — HKDF-SHA512, PBKDF2-SHA512
    hmac.rs           — HMAC-SHA256
    hash.rs           — SHA-512
    mnemonic.rs       — BIP-39 entropy→wordlist
    encoding.rs       — hex encode/decode
    nonce.rs          — 24-byte random nonce generation
```

### Cargo.toml dependencies

```toml
[package]
name = "vex-crypto"
version = "0.1.0"
edition = "2024"

[lib]
crate-type = ["cdylib"]  # for wasm-pack

[dependencies]
ed25519-dalek = { version = "2", features = ["rand_core"] }
x25519-dalek = { version = "2", features = ["static_secrets"] }
xsalsa20poly1305 = "0.9"      # RustCrypto AEAD (NaCl secretbox equivalent)
hkdf = "0.12"
hmac = "0.12"
sha2 = "0.10"                   # SHA-256, SHA-512
pbkdf2 = "0.12"
hex = "0.4"
getrandom = { version = "0.2", features = ["js"] }  # WASM-compatible RNG
bip39 = "2"
wasm-bindgen = "0.2"
serde = { version = "1", features = ["derive"] }
rmp-serde = "1"                 # msgpack (optional, if packing moves to Rust)

[profile.release]
opt-level = "z"                 # optimize for size
lto = true
strip = true
```

### WASM binding surface (via wasm-bindgen)

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn x_dh(my_secret: &[u8], their_public: &[u8]) -> Vec<u8> { /* x25519 */ }

#[wasm_bindgen]
pub fn x_kdf(ikm: &[u8]) -> Vec<u8> { /* HKDF-SHA512 */ }

#[wasm_bindgen]
pub fn x_hmac(msg: &[u8], sk: &[u8]) -> Vec<u8> { /* HMAC-SHA256 */ }

#[wasm_bindgen]
pub fn x_hash(data: &[u8]) -> String { /* SHA-512 hex */ }

#[wasm_bindgen]
pub fn x_make_nonce() -> Vec<u8> { /* 24 random bytes */ }

#[wasm_bindgen]
pub fn generate_sign_key_pair() -> Vec<u8> { /* 64 bytes: pubkey || secretkey */ }

#[wasm_bindgen]
pub fn sign_detached(msg: &[u8], secret_key: &[u8]) -> Vec<u8> { /* 64-byte sig */ }

#[wasm_bindgen]
pub fn verify_detached(msg: &[u8], sig: &[u8], public_key: &[u8]) -> bool { /* verify */ }

#[wasm_bindgen]
pub fn convert_public_key(ed25519_pub: &[u8]) -> Vec<u8> { /* ed25519 → x25519 */ }

#[wasm_bindgen]
pub fn encrypt_secret_box(msg: &[u8], nonce: &[u8], key: &[u8]) -> Vec<u8> { /* XSalsa20-Poly1305 */ }

#[wasm_bindgen]
pub fn decrypt_secret_box(cipher: &[u8], nonce: &[u8], key: &[u8]) -> Option<Vec<u8>> { /* decrypt */ }

#[wasm_bindgen]
pub fn encode_hex(bytes: &[u8]) -> String { /* hex encode */ }

#[wasm_bindgen]
pub fn decode_hex(hex: &str) -> Vec<u8> { /* hex decode */ }

#[wasm_bindgen]
pub fn x_mnemonic(entropy: &[u8]) -> String { /* BIP-39 */ }
```

### Build

```bash
wasm-pack build --target web --release
# produces: pkg/vex_crypto.js + pkg/vex_crypto_bg.wasm
```

### Consumption in JS (identical across platforms)

```ts
// @vex-chat/crypto/src/index.ts — thin JS wrapper
import init, * as wasm from './pkg/vex_crypto.js'

let initialized = false
async function ensureInit() {
  if (!initialized) {
    await init()  // loads .wasm
    initialized = true
  }
}

export async function xDH(mySecret: Uint8Array, theirPublic: Uint8Array): Promise<Uint8Array> {
  await ensureInit()
  return new Uint8Array(wasm.x_dh(mySecret, theirPublic))
}

export async function xHMAC(msg: Uint8Array, sk: Uint8Array): Promise<Uint8Array> {
  await ensureInit()
  return new Uint8Array(wasm.x_hmac(msg, sk))
}
// ... etc for all functions
```

**Note:** Functions become `async` because WASM module initialization is async. This is a minor API change from the current sync `xDH()`.

---

## Comparison: Phase A.5 (@noble/hashes) vs Rust WASM

| Dimension | Phase A.5 (@noble/hashes) | Rust WASM |
|---|---|---|
| **Effort** | 8 commits, incremental, each tested | New Rust crate + build pipeline + CI |
| **Risk** | Very low — RFC-identical byte output | Medium — new toolchain, WASM edge cases |
| **Result** | crypto-js is pure JS, still tweetnacl + @noble | Single WASM binary replaces everything |
| **Performance** | JS-speed crypto (~fine for chat) | Near-native speed, constant-time guarantees |
| **Auditability** | Multiple JS deps (tweetnacl + @noble/hashes + ed2curve) | One Rust crate with audited RustCrypto deps |
| **Bundle size** | ~60KB (tweetnacl + @noble) | ~50-80KB .wasm (depends on optimization) |
| **Constant-time ops** | Not guaranteed in JS (JIT can optimize away) | `subtle` crate provides ct comparison |
| **Test strategy** | Existing 14 Vitest tests stay as-is | Rust unit tests + JS integration tests against same vectors |
| **Future path** | Dead end — crypto stays JS forever | Foundation for Rust protocol core (Option C) |
| **Hermes/RN compat** | Works (pure JS) | Works (Hermes v1 native WASM on RN 0.84) |
| **Build complexity** | Zero (just JS) | Rust toolchain + wasm-pack + CI cross-compile |

---

## Recommended Strategy: Phase A.5 first, then Rust WASM

**Don't skip Phase A.5.** Do both, sequentially:

1. **Phase A.5 (now)** — migrate `node:crypto` → `@noble/hashes` in 8 commits. This unblocks browser/RN TODAY with zero new tooling. Ship it.

2. **Phase A.6 (next)** — build the Rust `vex-crypto` crate alongside the JS crypto. **Run both in parallel** with the same test vectors. Once the Rust crate passes all 14 existing Vitest tests against the same inputs/outputs, swap `@vex-chat/crypto`'s internals from JS → WASM imports.

3. **Deprecate tweetnacl + @noble/hashes** — once WASM is proven, remove JS crypto deps. The `.wasm` binary becomes the single crypto implementation.

4. **Future: Option C** — incrementally move X3DH session logic and mail encrypt/decrypt into the Rust crate. This is the path toward a `libsignal`-style Rust protocol core, but only when protocol complexity justifies it.

**Why this ordering:**
- Phase A.5 ships in days with zero risk — users get browser/RN support immediately
- Rust WASM takes weeks of Rust development + CI setup — don't block the migration on it
- Running both implementations against the same test vectors catches any divergence before swapping
- The thin JS wrapper (`@vex-chat/crypto/src/index.ts`) doesn't change shape — only internals swap from JS primitives to WASM calls

---

## Expo Integration Path

Since vex-chat mobile is on RN 0.84.1 with Hermes v1:

1. **Build:** `wasm-pack build --target web --release` produces `vex_crypto_bg.wasm` + JS glue
2. **Bundle:** Metro can bundle `.wasm` files as assets. The JS glue calls `WebAssembly.instantiate()`
3. **Load:** At app startup (before `Client.create()`), call `await init()` to load the WASM module
4. **Fallback:** For Expo SDK 55 (RN 0.83, no Hermes v1), use `wasm2js` to compile to pure JS — loses perf but keeps compatibility

For Tauri desktop: `.wasm` loads natively in the WebView (WebKit/Chromium both support WASM since 2017).

For Node.js (bots, spire, tests): Node has native WASM since v8+.

**One `.wasm` binary. Three runtimes. Zero platform-specific crypto code.**

---

## Open Questions

1. **Sync → async API change** — WASM module init is async (`WebAssembly.instantiate()`). Current crypto-js functions are all sync. Options:
   - Make all crypto functions async (mild churn in libvex-js call sites)
   - Initialize WASM eagerly at app boot, then call functions sync after init
   - Use `WebAssembly.Module` + `WebAssembly.Instance` synchronously in Node (works, but not in browser/RN)

2. **Rust expertise on team** — does the team have Rust experience? If not, Phase A.5 (@noble/hashes) carries the migration while someone ramps up on Rust.

3. **CI targets** — need `wasm32-unknown-unknown` in CI. GitHub Actions has `wasm-pack` pre-installed. But testing WASM in CI requires a JS runtime (Node works).

4. **WASM size budget** — `.wasm` binary with all crypto deps: estimate ~50-80KB gzipped. Acceptable for mobile? (For reference: Signal's Rust crypto WASM is ~120KB.)

5. **`getrandom` on WASM** — needs the `js` feature flag to use `crypto.getRandomValues()` as entropy source. Works in Hermes v1, browsers, Node. Verify Hermes exposes `crypto.getRandomValues`.

6. **msgpackr** — currently in crypto-js (`XUtils.packMessage`). Move to Rust (`rmp-serde`)? Or leave in JS since libvex-js uses it for WebSocket framing anyway?

---

## Consequences

### If we do Rust WASM (after Phase A.5)

**Positive:**
- Single auditable crypto crate replaces 3 JS deps (tweetnacl + ed2curve + @noble/hashes)
- Constant-time guarantees via `subtle` crate
- Foundation for Rust protocol core if protocol complexity grows
- Same binary everywhere — no per-platform crypto divergence
- Near-native performance for heavy operations (PBKDF2 key stretching, bulk decrypt)

**Negative:**
- Rust toolchain required for development (rustup, wasm-pack)
- CI must cross-compile to wasm32-unknown-unknown
- WASM module init adds ~5-10ms at app startup
- Debugging crypto issues requires Rust knowledge
- Sync → async migration for crypto functions (mild consumer churn)
