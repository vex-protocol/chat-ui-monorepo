# Auth: Upstream vs Reimplementation

> For background on the Vex platform and its cryptographic protocol, see [`vex-overview.md`](./vex-overview.md).

Comparison of authentication in [vex-chat/spire](https://github.com/vex-chat/spire) (`src/Spire.ts`, `src/Database.ts`) vs our reimplementation in `apps/spire/src/auth/index.ts`.

---

## Password Hashing

| | Upstream | Ours |
|---|---|---|
| Algorithm | PBKDF2-SHA512, 1000 iterations, 32-byte output | **argon2id** (m=19MiB, t=2, p=1) |
| Library | `pbkdf2` npm package (sync) | `argon2` npm package (async) |
| Salt source | `xMakeNonce()` from `@vex-chat/crypto` — 24-byte NaCl nonce | Embedded by argon2 (random per hash) |
| Output encoding | hex string | PHC format string (`$argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>`) |

**Upstream code** (`Database.ts:848`):
```ts
export const hashPassword = (password: string, salt: Uint8Array) =>
    pbkdf2.pbkdf2Sync(password, salt, ITERATIONS, 32, "sha512");
```

The upstream implementation is synchronous, blocks the event loop, and uses 1000 PBKDF2 iterations — **210× below the OWASP 2025 minimum of 210,000** for PBKDF2-SHA512. We use argon2id, the OWASP-preferred algorithm for new projects, which is memory-hard (resists GPU/ASIC attacks) and handles salt generation internally.

---

## JWT Signing

| | Upstream | Ours |
|---|---|---|
| Library | `jsonwebtoken` (CJS) | `jose` (ESM-native) |
| Secret env var | `process.env.SPK` (the NaCl server signing key — same key for signing and crypto ops) | `process.env.JWT_SECRET` (dedicated secret) |
| Login payload | `{ user: { userID, username, lastSeen } }` — nested under `user` key | `{ userID, username }` — top-level claims |
| Login expiry | `"7d"` string | 7 days (numeric seconds) |
| Delivery | HTTP cookie `auth` + JSON body `{ user, token }` | Return value only (no cookies) |

**Upstream** (`Spire.ts:420`):
```ts
const token = jwt.sign(
    { user: censorUser(userEntry) },
    process.env.SPK!,
    { expiresIn: JWT_EXPIRY }  // "7d"
);
res.cookie("auth", token, { path: "/", sameSite: "none", secure: true });
res.send(msgpack.encode({ user: censorUser(userEntry), token }));
```

The upstream uses the same `SPK` (server private key) for both NaCl cryptographic operations and JWT HMAC signing. This is a security coupling concern — our implementation separates these into `JWT_SECRET`.

---

## Action Tokens (Scoped Short-lived Tokens)

This is the biggest architectural divergence.

### Upstream: In-memory UUID store

Action tokens are **not JWTs**. They are UUID strings stored in a `private actionTokens: IActionToken[]` array on the `Spire` class instance.

```ts
// Spire.ts:131
private createActionToken(scope: TokenScopes): IActionToken {
    const token: IActionToken = {
        key: uuid.v4(),      // random UUID
        time: new Date(),
        scope,
    };
    this.actionTokens.push(token);  // stored in memory
    return token;
}

private validateToken(key: string, scope: TokenScopes): boolean {
    for (const rKey of this.actionTokens) {
        if (rKey.key === key && rKey.scope === scope) {
            const age = Date.now() - rKey.time.getTime();
            if (age < TOKEN_EXPIRY) {        // 10 minutes
                this.deleteActionToken(rKey); // single-use: consumed on validation
                return true;
            }
        }
    }
    return false;
}
```

**Properties of upstream tokens:**
- Single-use — consumed (deleted from array) on first valid use
- In-process only — tokens are lost on server restart
- Token itself is just a UUID, no signature
- Client must NaCl-sign the token UUID with their device signing key before submitting it, so the server can verify device ownership as part of redemption

### Ours: Stateless JWTs

```ts
// Our approach
generateToken(userID, tokenType) → JWT signed with JWT_SECRET
validateToken(token, tokenType) → verify signature + check exp + check tokenType claim
```

**Implications of our approach:**
- Stateless — no server-side storage, survives restarts
- Not single-use — a token can be reused until expiry (10 min window)
- No NaCl signature requirement — simpler client integration
- Token type is a claim inside the JWT, not a server-side enum check

If single-use tokens are needed in the future, a small Redis/DB-backed token revocation list can be added.

---

## Registration Flow

| | Upstream | Ours |
|---|---|---|
| Requires action token | Yes (type: Register) | Yes (type: register) |
| Token redemption | Client NaCl-signs the token UUID with their device signing key; server verifies signature | Client presents JWT token directly |
| userID source | `uuid.stringify(regKey)` — derived from the NaCl-signed registration token | Fresh `uuid.v4()` |
| Device creation | Bundled into registration — creates user + device + preKeys atomically | Separate (`/devices` endpoint) |
| Duplicate errors | Detects `ER_DUP_ENTRY` MySQL error codes by string matching (`users_username_unique`, `users_signkey_unique`) | Kysely throws; we catch and translate |

**Upstream registration payload** (`XTypes.HTTP.IRegistrationPayload`):
```ts
{
    username: string
    password: string
    signKey: string        // device NaCl signing public key (hex)
    signed: string         // NaCl signature of the registration token UUID
    preKey: string         // medium-term preKey (hex)
    preKeySignature: string
    preKeyIndex: number
    deviceName: string
}
```

Our `registerUser(db, username, password)` takes only username and password — device registration is a separate step. This simplifies the auth boundary but requires an additional request for a new device.

---

## JWT Verification Middleware

**Upstream** (`server/index.ts:51`):
```ts
const checkAuth = (req, res, next) => {
    if (req.cookies.auth) {
        try {
            const result = jwt.verify(req.cookies.auth, process.env.SPK!);
            req.user = result.user;   // nested under "user" key
            req.exp  = result.exp;
        } catch (err) { /* silently ignored */ }
    }
    next(); // always continues — protect() enforces auth
};
```

Authentication is cookie-based. The `protect` middleware is a separate guard that checks `req.user` is set. Our implementation uses Authorization header Bearer tokens (standard REST pattern, no cookies).

---

## Database Layer

| | Upstream | Ours |
|---|---|---|
| Query builder | Knex | Kysely |
| Default DB | MySQL | SQLite (configurable → PostgreSQL) |
| Schema management | `if (!hasTable) createTable` inline in `Database.init()` | Versioned Kysely migrations (`001_` → `011_`) |
| Type safety | Runtime types from `@vex-chat/types` | Compile-time `Database` interface in `src/db/types.ts` |

The upstream `Database` class creates tables on startup if they don't exist — there is a `migrations/` directory in the repo but the production code doesn't use it (the `init()` method handles DDL inline). This means schema changes require manual `ALTER TABLE` in production.

---

## Alignment: Full Fidelity

This project is **privacy-first**. We match the upstream privacy model exactly. The table below reflects final decisions.

| Concern | Upstream | Ours | Status |
|---|---|---|---|
| Token storage | In-memory single-use UUID array | In-memory single-use UUID array (`createTokenStore()`) | **Aligned** |
| Token reuse | Single-use, consumed on validation | Single-use, consumed on validation | **Aligned** |
| Token redemption | Requires NaCl device signature | Requires NaCl device signature | **Aligned** |
| userID | `uuid.stringify(nacl.sign.open(signed, signKey))` — client-derived | Same | **Aligned** |
| Registration | NaCl sig + device + preKey bundled atomically | Same | **Aligned** |
| JWT secret | `process.env.SPK` (NaCl key reused) | `process.env.JWT_SECRET` (dedicated secret) | **Improved** — key hygiene |
| JWT payload | `{ user: { userID, username, lastSeen } }` nested | Same censoredUser structure | **Aligned** |
| JWT library | `jsonwebtoken` (CJS) | `jose` (ESM-native) | **ESM constraint** — same semantics |
| Transport | HTTP cookie `auth` | Bearer token header | **Divergence** — more REST-conventional, easier to test |
| Async hashing | Sync `pbkdf2Sync` (blocks event loop) | Async `crypto.pbkdf2` | **Improved** — non-blocking |
| DB | Knex + MySQL | Kysely + SQLite/PG | **Improved** — compile-time type safety |

### Notes on divergences

**JWT transport (cookie vs Bearer):** Upstream sets an `httpOnly` cookie named `auth`. We use `Authorization: Bearer <token>`. Both carry the same 7-day JWT. Cookie transport is marginally more phishing-resistant in browser clients but less ergonomic for mobile/desktop clients and tests. This is the one deliberate deviation from upstream that does not affect the privacy model.

**JWT secret separation:** Upstream uses the NaCl server signing key (`SPK`) as the HMAC-SHA256 JWT secret. This creates key reuse across two cryptographic systems (Ed25519 signing and HMAC-SHA256). We use a dedicated `JWT_SECRET` env var. The privacy properties are identical; this is a hygiene improvement.

---

## JWT Signing Algorithm: HS256 vs RS256 vs ES256

We use **HS256** (HMAC-SHA256) with a shared `JWT_SECRET`. This is a deliberate choice for this deployment model, not a default.

### When each algorithm is appropriate

| Algorithm | Key type | Best for | Weakness |
|---|---|---|---|
| **HS256** | Shared secret | Single service — same process signs and verifies | Secret leaks → every service must rotate; brute-forceable with weak keys |
| **RS256** | RSA key pair | Distributed systems — publish public key, protect private | Large keys (2048+ bits); slower; key rotation is complex |
| **ES256** | ECDSA P-256 key pair | New projects needing distributed or public key distribution | Requires key pair management |

### Why HS256 is right here

Spire is a **single-service monolith** — the same process that signs JWTs also verifies them. There are no external services that need to read the JWT. HS256 is appropriate in this topology.

If Spire were split into microservices (e.g., a separate WebSocket gateway, a separate API gateway), you would want to switch to ES256 or RS256 so the private signing key stays on the auth service and other services only receive the public key for verification.

### HS256 key requirements (CRITICAL)

HS256 uses HMAC-SHA256. The security of the scheme depends entirely on the secret being:
- **At least 256 bits (32 bytes)** — the RFC 7518 minimum. Shorter keys are brute-forceable.
- **Cryptographically random** — not a human-readable passphrase or a NaCl key repurposed for this (see upstream's SPK mistake above).
- **Never committed to source control** — set via environment variable only.

Generate a production secret:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

A 64-byte (512-bit) hex secret is recommended — it doubles the HMAC key material compared to the minimum and costs nothing at runtime.

---

## Hex Encoding: Why Buffer Is Fine (and When It Isn't)

All hex encode/decode in `src/auth/index.ts` uses `Buffer`:

```ts
Buffer.from(bytes).toString('hex')       // encode
new Uint8Array(Buffer.from(hex, 'hex'))  // decode
```

This is intentional. `Buffer` is Node.js-native, zero-dependency, and the fastest available option on LTS releases (18, 20, 22).

### The caveat worth knowing

The TC39 `Uint8Array` base64/hex proposal reached **Stage 4** and shipped as Baseline 2025 in browsers:

```ts
// Native in browsers (Sep 2025) and future Node.js
Uint8Array.fromHex(hex)
uint8Array.toHex()
```

These are **not yet available in any Node.js LTS** as of early 2026. They will eventually make `Buffer` unnecessary for this use case.

If any code in this repo is ever shared with a browser environment (e.g., moved to a shared `packages/` module), replace `Buffer` with [`uint8array-extras`](https://github.com/sindresorhus/uint8array-extras) (`hexToUint8Array` / `uint8ArrayToHex`), which works identically in both environments.

**Rule of thumb:** `Buffer` in `apps/spire` (Node.js only) is fine. Any code in a shared package that may run in a browser should use `uint8array-extras` or the native `Uint8Array` API once Node.js LTS supports it.

---

## Crypto library: @noble/curves

We use **`@noble/curves`** (Ed25519 via `@noble/curves/ed25519`) for all signing operations, wrapped in `@vex-chat/crypto`. The original upstream used tweetnacl; we migrated for RFC 8032 compliance, active maintenance, and a more recent Cure53 audit (2022).

Our `@vex-chat/crypto` package preserves NaCl-compatible wire format (64-byte signature prepended to message) so the protocol is unchanged from upstream — only the underlying library differs.

```ts
import { generateSignKeyPair, signMessage, verifyNaClSignature, encodeHex } from '@vex-chat/crypto'

const keyPair = generateSignKeyPair()              // { publicKey, secretKey } — 32 bytes each
const signed = signMessage(message, keyPair.secretKey) // 64-byte sig || message (NaCl format)
const original = verifyNaClSignature(signed, keyPair.publicKey) // Uint8Array | null
```

---

## Token Store: Memory and Production Considerations

### What the upstream does

The upstream `Spire` class stores tokens in a plain `IActionToken[]` array with no cleanup loop:

```ts
private actionTokens: IActionToken[] = []
private createActionToken(scope): IActionToken { /* push to array */ }
private validateToken(key, scope): boolean { /* find + splice on success */ }
```

Consumed tokens are removed on successful validation. Expired-but-never-consumed tokens stay in the array forever.

### What happens in production without cleanup

Action tokens are created whenever a client requests a scoped operation (register, connect, file upload, etc.). A consumed token is removed immediately. An unconsumed token — where the client starts but never completes — is never removed.

Under normal load this leaks slowly. Under a basic DoS — repeatedly hitting `/tokens` endpoints to create tokens and never consuming them — it becomes an unbounded allocation attack. Each `IActionToken` entry is small (~200 bytes), but at millions of entries it adds up, and there is no ceiling.

The upstream is exposed to the same issue. It was never fixed there.

### Our fix: sweep + unref

```ts
const sweep = setInterval(() => {
  const cutoff = Date.now() - TOKEN_EXPIRY
  for (const [key, token] of store) {
    if (token.time.getTime() < cutoff) store.delete(key)
  }
}, 5 * 60 * 1000)
sweep.unref()
```

- **Sweep every 5 minutes** removes all tokens older than 10 minutes (TOKEN_EXPIRY). Any unconsumed expired token is collected within one sweep interval.
- **`.unref()`** is critical: without it, the `setInterval` timer keeps the Node.js process alive even after all other async work is done. This causes test suites to hang indefinitely waiting for the timer to fire. `unref()` tells Node.js it can exit naturally even if this timer is still pending.

The sweep should **always stay**. It has no meaningful overhead (a Map iteration every 5 minutes) and prevents a class of memory exhaustion that the upstream left unaddressed. It also makes the server safer to run under load without a rate limiter on token-issuing endpoints.

---

See also: [vex-overview.md](vex-overview.md) for the cryptographic protocol, [architecture.md](architecture.md) for security invariants, [glossary.md](glossary.md) for term definitions.
