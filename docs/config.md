# Configuration: Environment Variables and `src/config.ts`

Explains how spire's environment is validated at startup.

---

## Schema (`ConfigSchema`)

All environment variables are validated with Zod at startup. No module may read `process.env` directly — all config values must come from the validated `Config` object.

```
DB_TYPE          sqlite | postgres        required
DATABASE_URL     string                   required if DB_TYPE=postgres
SQLITE_PATH      string                   optional (defaults to ./spire.db if sqlite)
SPK              string (min 1 char)      required — NaCl server signing key (hex)
JWT_SECRET       string (min 32 chars)    required — JWT HMAC secret (SEPARATE from SPK)
API_PORT         number (coerced)         default: 16777
LOG_LEVEL        trace|debug|info|warn|error   default: info
NODE_ENV         development|production|test    default: development
```

---

## `SPK` vs `JWT_SECRET` — Key Hygiene

These are intentionally two separate fields:

- **`SPK`** — the server's NaCl Ed25519 signing private key. Used only for NaCl cryptographic operations (token signing, key derivation). Never used as a JWT secret.
- **`JWT_SECRET`** — the HMAC secret for JWT signing/verification (HS256). Must be ≥ 32 characters (256 bits). Never used for NaCl operations.

Using the same key for both would violate cryptographic key separation. A key designed for NaCl's Ed25519 curve arithmetic is not the right shape for an HMAC-SHA256 operation.

---

## Singleton Pattern

`parseConfig(env?)` is a factory function — useful for testing with injected env objects. Application code should not call it directly. Instead, the server entrypoint creates a single validated instance:

```ts
// src/server.ts
import { parseConfig } from '#config'

const config = parseConfig() // throws ZodError if any required var is missing
```

Because ES modules are cached after first evaluation, this becomes an in-process singleton. Any downstream module that receives `config` as a parameter gets the already-validated object.

**Why not export `config` from `config.ts` itself?**

`config.ts` is imported in tests with `parseConfig(mockEnv)` — if the module also ran `parseConfig()` at the top level, it would attempt to parse `process.env` during test file loading, which fails because `DB_TYPE`, `SPK`, etc. are not set in the test environment. Keeping `parseConfig` as a pure factory avoids this.

---

## Error Safety

If startup fails due to a missing required variable:

```ts
// In server.ts:
import { parseConfig } from '#config'
import { z } from 'zod'

let config
try {
  config = parseConfig()
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error('Fatal: invalid environment configuration\n' + z.prettifyError(err))
  } else {
    console.error(err)
  }
  process.exit(1)
}
```

**Why not let the raw `ZodError` propagate as an uncaught exception?**

An uncaught `ZodError` includes a `.issues` array where each issue contains the received value that failed validation. If `JWT_SECRET` is set to a string that's too short, the actual secret value appears in `ZodError.issues[0].received`. If this error is logged via `JSON.stringify(err)` or passed to an error monitoring service, the secret leaks.

`z.prettifyError(err)` (Zod v4 built-in) formats the error as a human-readable tree showing field names and failure messages — but not the received values.

---

## Secrets Exposure Risks

| Risk | Mitigation |
|---|---|
| `ZodError` echoes raw secret values in `.issues[n].received` | Use `safeParse` + `z.prettifyError` at the startup boundary |
| Accidentally logging `config` object | Log only safe fields: `{ port: config.API_PORT, env: config.NODE_ENV }` |
| Pino logging req/res bodies with tokens | Redact `*.token`, `*.secret`, etc. in `logger.ts` |
| Stack traces from JWT verification failures | Use typed error classes that don't include key material in `.message` |

---

## Zod v4 Utilities

The project is on `zod@^4.x`. Useful v4 APIs for env validation:

- **`z.stringbool()`** — for boolean env vars (`ENABLE_TLS=true`). Unlike `z.coerce.boolean()`, this correctly handles the string `"false"` → `false`. `z.coerce.boolean()` would coerce `"false"` → `true` (any non-empty string is truthy).
- **`z.prettifyError(err)`** — human-readable multi-line error tree (built-in, no extra dependency).
- **`z.flattenError(err)`** — returns `{ formErrors, fieldErrors }` map; useful for programmatic error handling.

Example with boolean flag:

```ts
// ✅ Zod v4 pattern for boolean env vars
ENABLE_TLS: z.stringbool().default(false),

// ❌ Wrong — z.coerce.boolean() coerces "false" → true
ENABLE_TLS: z.coerce.boolean().default(false),
```

---

## Why Not `t3-env`?

`@t3-oss/env-core` provides a `createEnv()` helper that uses a Proxy to throw at runtime if server-only variables are accessed from a client bundle. This is valuable for Next.js / Remix / Nuxt apps where server and client share a codebase.

For a standalone Node.js Express server, there is no client bundle and no client/server separation problem. Manual Zod validation is simpler, more transparent, and gives full control over error formatting. `t3-env` would add an indirect abstraction without providing any of its key benefits.
