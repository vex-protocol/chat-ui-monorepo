# Old Spire: Migration Path & What's Worth Porting

> **Goal**: Keep old spire's master as stable as possible. Only port changes
> that fix real problems. This doc maps every difference between old and new
> spire, explains *why* the change was made, and rates whether it's worth
> porting.

## Guiding principle

Old spire works. It has shipped. The new spire was a ground-up rewrite that
improved many things, but a rewrite is not a prerequisite for a working
product. Port **security fixes** and **correctness bugs**. Defer everything
else until it causes pain.

---

## Tier 1 — Port now (security / correctness)

These are real vulnerabilities or correctness issues. Minimal code change,
high impact.

### 1.1 Password hashing: PBKDF2 → argon2id ✓ DONE

| | Old | Current |
|---|---|---|
| Algorithm | PBKDF2-SHA512, **1,000 iterations** | argon2id (library defaults) |
| Library | `pbkdf2` npm package | `argon2` npm package |

**Completed**: New registrations use argon2id. Existing PBKDF2 users are
lazily re-hashed on successful login via `upgradeHashIfNeeded()`. Added
`hashVersion` column to users table (1=PBKDF2, 2=argon2id), auto-migrated
on startup.

### 1.2 Stop logging secrets

Old spire logs in plaintext (ADR-003 audit):

| What's logged | Where | Impact |
|---|---|---|
| Action tokens (register, file, device) | `Spire.ts:153, 293` | Account takeover |
| User details on WS connect | `Spire.ts:203` | User enumeration |
| Recipient device IDs in mail | `Spire.ts:358, ClientManager.ts:281` | Communication graph |
| Stack traces sent to clients | `server/index.ts` (6 locations) | Internal path disclosure |

**Scope of change**: Grep for `console.log`, `logger.info`, `logger.debug`
in Spire.ts, ClientManager.ts, server/index.ts. Remove or redact any line
that includes tokens, user IDs, device IDs, or passwords. Replace client-
facing `catch (e) { res.status(500).send(e) }` with generic error messages.

**Risk**: Very low. Removing log lines can't break functionality.

### 1.3 Separate JWT secret from server signing key

Old spire reuses `SPK` (the NaCl server private key) as the JWT HMAC secret.
If the JWT secret leaks (e.g. via a log or error), the server's identity key
is also compromised.

**Scope of change**: Add `JWT_SECRET` env var. Use it in `jsonwebtoken.sign()`
and `.verify()` instead of `SPK`. Update `.env.example`.

**Risk**: Low. Existing JWTs will invalidate (users re-login). Coordinate
with a deploy window.

---

## Tier 2 — Port when it hurts (reliability / developer experience)

These improve correctness and velocity but aren't urgent security issues.
Port them one at a time when the relevant area is already being touched.

### 2.1 Error responses: stop sending stack traces

Six locations in `server/index.ts` catch errors and send the raw error
object (including stack trace, DB errors, library versions) to the client.

**Why**: Information disclosure. An attacker learns internal paths, library
versions, and database structure from error messages.

**What to port**: Replace raw error forwarding with a simple error response:
```typescript
res.status(500).json({ error: 'Internal server error' })
```

### 2.2 Crypto: TweetNaCl → @noble ✓ DONE

| | Old | Current |
|---|---|---|
| Library | `tweetnacl@1.0.3` | `@noble/curves` via `naclCompat.ts` |
| Maintained | Last release 2018 | Active, audited (Cure53), TypeScript-native |

**Completed**: All 5 `nacl.sign.open()` calls and 1
`nacl.sign.keyPair.fromSecretKey()` call replaced with `@noble/curves`
equivalents in `src/utils/naclCompat.ts`. `tweetnacl` removed from
dependencies. Wire format unchanged. TypeScript upgraded 4.1 → 5.9 to
support `@noble/curves` type declarations.

### 2.3 Validation: ad-hoc checks → Zod schemas

Old spire validates request bodies with inline `if (!body.username)` checks
scattered across route handlers. Missing checks = silent bugs.

**Why**: Zod schemas are a single source of truth. They validate, infer
TypeScript types, and can generate OpenAPI docs. Catches malformed input
before it reaches business logic.

**Scope**: Add Zod as a dep. Write schemas for each route's expected body.
Add a `validateBody(schema)` middleware. Replace inline checks.

**Risk**: Low per-route. Can be done incrementally — one route at a time.

### 2.4 Database: Knex → Kysely

| | Old | Target |
|---|---|---|
| Library | `knex@0.21.12` | `kysely@0.27` |
| Type safety | Runtime errors | Compile-time SQL type checking |
| Migrations | `if (!hasTable) createTable` in init() | Versioned files (001_ → 012_) |

**Why**: Knex queries are untyped strings at compile time. A typo in a
column name is a runtime error. Kysely catches these at build time.

**Scope**: Large. Every query in `Database.ts` needs rewriting. The schema
stays the same. This is a "port when you're already rewriting the DB layer"
change, not a standalone task.

**Risk**: High — touches every query. Needs full test coverage before
attempting. Consider this the last migration, not the first.

### 2.5 Tests: 0 → coverage

Old spire has a Jest config but effectively zero tests. New spire had 255+
tests with in-memory SQLite and factory helpers.

**Why**: Without tests, every change is a gamble. The security fixes in
Tier 1 should ideally have tests before and after.

**Scope**: Add Vitest (or keep Jest). Write tests for auth, devices, mail,
and permissions. Use in-memory SQLite (`DB_TYPE=sqlite3mem`).

**Risk**: None — tests don't change production code.

---

## Tier 3 — Nice to have (modernization)

These are quality-of-life improvements. Don't port unless you're already
in the area and the change is trivial.

### 3.1 Express 4 → Express 5

Express 5 has native async error handling (`async (req, res) => {}` routes
propagate rejections automatically). Express 4 requires explicit
`try/catch` or `express-async-errors`.

**Why**: Reduces boilerplate, prevents unhandled promise rejections.

**When**: If you're already touching route handlers for Zod validation.

### 3.2 CommonJS → ESM

Old spire is CJS (`require()`). New spire was ESM-only.

**Why**: ESM is the standard. Tree-shaking, top-level await, native in
Node 22+.

**When**: Only if a dependency forces it. CJS works fine for a server.

### 3.3 Winston → Pino

Old spire uses Winston + Morgan. New spire used Pino with structured JSON.

**Why**: Pino is faster (5-10× throughput) and has built-in redaction.

**When**: After the Tier 1 log cleanup. The immediate fix is removing
secret logging, not swapping the logger.

### 3.4 Rate limiting

Old spire has no rate limiting. New spire had `express-rate-limit` (500
requests/15 min global, 10/15 min on auth).

**Why**: Prevents brute-force login attempts and API abuse.

**When**: Easy to add (`npm i express-rate-limit`, 5 lines in
`server/index.ts`). Low risk. Could justify Tier 2 if the server is
public-facing.

### 3.5 Structured logging / OpenTelemetry

New spire replaced logging with OpenTelemetry tracing (ADR-003). Only 13
operational attributes, no user data. Exported to Honeycomb.

**Why**: Privacy-first observability. Traces > logs for debugging
distributed systems.

**When**: After Pino migration. This is a philosophy change, not a library
swap. Requires collector infrastructure.

### 3.6 OpenAPI spec generation

New spire derived OpenAPI specs from Zod schemas, linted with Spectral.

**Why**: Auto-generated API docs, client SDK generation, contract testing.

**When**: After Zod migration (Tier 2.3). It's a downstream benefit of
having schemas, not a standalone task.

---

## What NOT to port

These were new-spire design choices that don't apply to old spire:

- **better-sqlite3 only** — Old spire supports MySQL. Keep it. MySQL is
  needed for multi-instance deployments.
- **3-layer architecture enforcement** (eslint-plugin-boundaries) — Nice in
  a greenfield. Not worth retrofitting.
- **Path aliases** (`#db/*`, `#auth/*`) — TypeScript convenience. Not worth
  the config churn in an existing codebase.
- **Domain-based file organization** — Old spire's `Spire.ts` +
  `Database.ts` + `server/*.ts` structure works. Don't reorganize.

---

## Suggested order of operations

Minimal changes, maximum impact:

```
1. Stop logging secrets          (Tier 1.2 — 30 min, grep + delete)
2. Separate JWT secret           (Tier 1.3 — 15 min, new env var)
3. Upgrade password hashing      (Tier 1.1 — 1-2 hrs, with migration path)
4. Generic error responses       (Tier 2.1 — 30 min, 6 catch blocks)
5. Add rate limiting             (Tier 3.4 — 15 min, if public-facing)
```

Everything else waits until there's a reason.
