# Architecture: apps/spire

A guide for contributors — especially backend newcomers — to understand how the pieces fit together.

> **Packages layer:** For `packages/types`, `packages/crypto`, and `packages/libvex` see [`docs/packages.md`](./packages.md).

---

## The Big Picture

`apps/spire` is a Node.js HTTP + WebSocket server. A client sends an HTTP request. The server validates it, calls a service function, and returns a response. The service function does work against the database.

```
HTTP Request
    │
    ▼
Route Handler          ← validates input (Zod), verifies NaCl signatures, calls service
    │
    ▼
Service Function       ← business logic, DB operations (Kysely), returns typed result
    │
    ▼
SQLite / PostgreSQL    ← Kysely handles SQL generation, parameterization, and types
```

Each layer has one job. Business logic never lives in route handlers. HTTP knowledge never leaks into service functions.

---

## Layer Rules

### Route handlers (`src/routes/`)
- Parse and validate the request body/params with Zod. Return 400 before calling any service.
- Perform NaCl signature verification if the endpoint requires it.
- Call one service function. Map the result to an HTTP response.
- Never contain `SELECT`, `INSERT`, or any direct DB query.

### Service functions (`src/auth/`, `src/devices/`, `src/mail/`, etc.)
- Receive already-validated, already-typed arguments.
- Do not re-validate or re-verify signatures — trust the route handler.
- Perform DB operations using the injected `db: Kysely<Database>` instance.
- Throw on error; the route handler or error middleware converts it to an HTTP status.
- Never import anything from `express`.

### Database (`src/db/`)
- `types.ts` — the single source of truth for all table shapes. If the DB schema changes, update this file and the corresponding migration.
- `migrations/` — one file per schema change, numbered sequentially.
- `migrate.ts` — `migrateToLatest()` runs at server startup and in tests.
- `index.ts` — thin public barrel re-exporting only the `Database` type. The only `index.ts` in the codebase that is intentionally a barrel (stable, curated, one export).

---

## File Naming Conventions

### Service files: `{domain}.service.ts`, not `index.ts`

Implementation files are named descriptively. `index.ts` as a catch-all for business logic obscures what a file does in stack traces and imports.

```
src/auth/
  auth.service.ts    ← service functions
  auth.schemas.ts    ← Zod schemas + inferred types
  __tests__/
    auth.test.ts

src/devices/
  devices.service.ts
  devices.schemas.ts
  __tests__/
    devices.test.ts
```

The `db/` module is the only exception: it keeps a thin `index.ts` barrel because it publishes a stable, deliberately curated public API (`Database` type) that other modules import.

### Tests: co-located `__tests__/` folders

Unit tests live inside `src/` next to the code they test. Shared test infrastructure (factories, DB helpers, setup) lives in the top-level `test/` directory. This hybrid is the recommended pattern: co-located tests for discoverability, a shared `test/` for infrastructure that spans domains.

---

## Path Aliases

All cross-domain and test imports use `#`-prefixed aliases. These are declared in three places that must stay in sync:

| File | Purpose |
|---|---|
| `package.json` → `"imports"` | Runtime resolution (Node.js native subpath imports) + TypeScript 5.4+ auto-resolution |
| `tsconfig.json` → `compilerOptions.paths` | IDE type checking for older tools that don't read `package.json#imports` |
| `vitest.config.ts` → `alias` | Vitest's Vite-based module resolver |

Current aliases:

```
#db/*       → src/db/*
#auth/*     → src/auth/*
#devices/*  → src/devices/*
#utils/*    → src/utils/*
#config     → src/config.js
#openapi    → src/openapi.js
#errors     → src/errors.js
#test/*     → test/*
```

**Rules:**
- Use `#alias/file.ts` for any import that crosses domain boundaries or goes from `test/` into `src/`.
- Keep relative imports (`./auth.schemas.ts`) within the same domain folder.
- All imports use `.ts` extensions — never `.js`. Node 24 resolves `.ts` directly; `tsc` rewrites them to `.js` in the production build via `rewriteRelativeImportExtensions`.
- When adding a new domain (`src/mail/`, `src/servers/`, etc.), add its alias to all three files.

---

## OpenAPI

The project uses [`@asteasolutions/zod-to-openapi`](https://github.com/asteasolutions/zod-to-openapi) (v8, Zod v4 compatible) to generate OpenAPI 3.1 documentation from Zod schemas.

### `src/openapi.ts` — single registry, single call site

```ts
import { extendZodWithOpenApi, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)         // mutates Zod prototype — called exactly once
export const registry = new OpenAPIRegistry()
export function generateOpenAPIDocument() { ... }
```

**Rules:**
- `extendZodWithOpenApi(z)` is called once in `src/openapi.ts` (production) and once in `test/setup.ts` (test environment). It is idempotent — calling it twice does not cause errors.
- Route files call `registry.registerPath(...)` when they are imported. The `scripts/generate-openapi.ts` script imports all route files to trigger these registrations, then calls `generateOpenAPIDocument()`.
- Use `.openapi({ description: '...' })` on Zod schemas to annotate them. In Zod v4, Zod's native `.meta()` is also supported and read by `@asteasolutions/zod-to-openapi` v8.

### Library choice rationale

| | `@asteasolutions/zod-to-openapi` | `samchungy/zod-openapi` |
|---|---|---|
| Weekly downloads | ~1.5M | ~448K |
| Zod v4 support | v8+ | Yes (native `.meta()`) |
| Setup | `extendZodWithOpenApi(z)` once | None |
| OpenAPI version | 3.0 and 3.1 generators | 3.x |

We use `@asteasolutions/zod-to-openapi` because it is the established choice (3× more popular) with active Zod v4 maintenance. The prototype mutation is contained to `src/openapi.ts`. If a future refactor moves to `samchungy/zod-openapi`, the route registration calls would be restructured around `createDocument()` instead.

### Spectral linting

`scripts/generate-openapi.ts` writes `openapi.json`. Add a `lint:openapi` script that runs Spectral on it:

```yaml
# .spectral.yaml — recommended baseline
extends:
  - ["spectral:oas", "recommended"]
  - "https://unpkg.com/@stoplight/spectral-owasp-ruleset/dist/ruleset.mjs"
```

The `spectral:oas` recommended ruleset enforces operationId uniqueness, success responses, path hygiene, and tag definitions. The OWASP ruleset adds API Security Top 10 2023 checks (auth on all endpoints, rate limiting, no 500 exposure, etc.).

---

## Zod Schemas and TypeScript Types

**Rule: derive types from schemas, never write them separately.**

```ts
// ✅ schemas.ts — one source of truth
import { z } from 'zod'

export const DevicePayloadSchema = z.object({
  signKey: z.string().regex(/^[0-9a-f]{64}$/),
  deviceName: z.string().min(1),
  // ...
})

export type DevicePayload = z.infer<typeof DevicePayloadSchema>

// ✅ index.ts — import the type, don't redefine it
import type { DevicePayload } from './schemas.js'
```

If you define a `z.object(...)` schema AND a separate `interface` with the same fields, they will eventually diverge. `z.infer<>` eliminates the duplication.

---

## The App Factory Pattern

**Rule: `buildApp(db)` returns an Express app. Only `server.ts` calls `listen()`.**

```
src/app.ts     → export function buildApp(db: Kysely<Database>): Express
src/server.ts  → import { buildApp } from './app.js'; buildApp(db).listen(port)
```

Tests import `buildApp(db)` directly. They pass in a fresh in-memory SQLite instance and never start a real server. This is why `listen()` must not appear in `app.ts`.

See `testing-strategy.md` for the full test setup.

---

## Middleware Order

Global middleware must be registered in this exact order in `buildApp()`:

```
helmet()          ← security headers (must be first)
cors()            ← CORS (must be before body parsing)
express.json()    ← body parsing
rateLimit()       ← global rate limiter (after body parsing)
pino-http         ← request logging (with IP/UA redacted)
routes            ← feature routers
404 handler       ← catch-all for unknown routes
error middleware  ← MUST be last
```

Route-specific tighter limits (auth endpoints — login, register, token) are applied at the router level on top of the global limiter.

---

## Route Handler Rules

**Route handlers must be thin — under 15 lines. No fat controllers.**

A route handler has exactly three jobs:
1. Parse and validate the request (Zod schema via `validateBody`/`validateParams` middleware)
2. Call one service function
3. Send the response

```ts
// ✅ Thin handler
router.post('/register', validateBody(RegistrationPayloadSchema), async (req, res) => {
  const user = await registerUser(db, req.body)
  res.status(201).json(user)
})

// ❌ Fat handler — business logic in the route
router.post('/register', async (req, res) => {
  const { username } = req.body
  if (!username || username.length < 3) return res.status(400).json({ error: '...' })
  const existing = await db.selectFrom('users').where('username', '=', username).executeTakeFirst()
  if (existing) return res.status(409).json({ error: '...' })
  // ... 20 more lines
})
```

---

## Validation Middleware

Use a `validateBody(schema)` middleware factory to validate request bodies at the route boundary. This keeps validation out of both route handlers and service functions.

```ts
// src/middleware/validate.ts
import type { RequestHandler } from 'express'
import { z } from 'zod'
import { ValidationError } from '../errors.js'

export function validateBody<T>(schema: z.ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body)
    if (!result.success) throw new ValidationError(result.error.message)
    req.body = result.data
    next()
  }
}

export function validateParams<T>(schema: z.ZodType<T>): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.params)
    if (!result.success) throw new ValidationError(result.error.message)
    next()
  }
}
```

Route handlers receive a fully typed, already-validated `req.body` — they never call `.parse()` themselves.

---

## Typed Request Properties (`express.d.ts`)

Do not cast `req` to custom types inside route handlers (`req as AuthenticatedRequest`). Instead, extend the Express namespace globally:

```ts
// src/types/express.d.ts
import type { CensoredUser } from '../auth/index.js'
import type { Device } from '../devices/index.js'

declare global {
  namespace Express {
    interface Request {
      user?: CensoredUser
      device?: Device
    }
  }
}
```

After `checkAuth` runs, `req.user` is typed everywhere — no casting required.

---

## Router Factory Pattern

Each domain gets its own router factory. This keeps `app.ts` clean and makes routers independently testable.

```ts
// src/routes/auth.ts
export function createAuthRouter(db: Kysely<Database>, tokenStore: ITokenStore): Router {
  const router = express.Router()
  router.use(authRateLimit)         // tighter rate limit for auth endpoints
  router.post('/auth', validateBody(LoginSchema), async (req, res) => { ... })
  router.post('/register', validateBody(RegistrationPayloadSchema), async (req, res) => { ... })
  return router
}

// src/app.ts
export function buildApp(db: Kysely<Database>): Express {
  const app = express()
  const tokenStore = createTokenStore()
  app.use(helmet())
  app.use(cors())
  app.use(express.json())
  app.use(globalRateLimit)
  app.use(pinoHttp({ ... }))
  app.use(createAuthRouter(db, tokenStore))
  app.use(createUserRouter(db))
  // ...
  app.use(errorMiddleware)
  return app
}
```

---

## Error Handling

Service functions throw. Route handlers do not `try/catch` everything themselves. Instead, a single Express error middleware at the top level catches all errors and maps them to HTTP responses:

```
Service throws ConflictError  →  error middleware  →  409 response
Service throws ValidationError →  error middleware  →  400 response
Service throws (anything else) →  error middleware  →  500 response
```

Custom error classes live in `src/errors.ts`:
- `ConflictError` → 409 (duplicate username, duplicate signKey)
- `ValidationError` → 400/422 (input format wrong)
- `NotFoundError` → 404
- `AuthError` → 401
- `ForbiddenError` → 403

**Never map errors by inspecting `error.message` strings in route handlers.** Use typed error classes.

**The error middleware MUST declare exactly 4 parameters** — Express identifies error-handling middleware by `function.length`. If you omit `next`, Express treats it as a regular middleware and errors pass through unhandled:

```ts
// ✅ Correct — 4 params
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  // ...
})

// ❌ Wrong — 3 params, Express ignores this as an error handler
app.use((err: Error, req: Request, res: Response) => {
  // never called for errors
})
```

**Express 5 note:** Async route handlers that throw or reject automatically pass the error to the error middleware — no `try/catch` or `.catch(next)` needed.

---

## Privacy Model (condensed)

The full model is in `AGENTS.md`. In brief:

1. **Identity is a key pair, not a username.** When a user registers, they generate a NaCl Ed25519 key pair on their device. The private key never leaves their device. The server stores only the public key.

2. **userID comes from the client.** It is `uuid.stringify(nacl.sign.open(signed, signKey))` — derived from the client's cryptographic signature over a server-issued token. The server cannot assign arbitrary userIDs.

3. **Action tokens are single-use.** The server issues a UUID token. The client signs it with their device key and sends it back. The server verifies the signature and consumes the token. A token can be used exactly once.

4. **Mail is a relay, not a store.** When a recipient fetches their inbox, the server deletes those messages. The server never holds plaintext — only ciphertext.

---

## Security Invariants

These rules are derived directly from the Vex privacy policy and cryptographic protocol. Violating them breaks the promise that **the server cannot read, forge, or misdirect messages**.

### What the server MUST enforce

#### 1. Device ownership on key material uploads

One-time keys (OTKs) and pre-keys are consumed during X3DH session establishment. If an attacker can upload OTKs to a device they don't own, they can inject their own key material into the key exchange. The next sender who fetches that device's key bundle would unknowingly establish a session with the attacker instead of the device owner — a **man-in-the-middle on the encryption layer**.

This violates the privacy policy's guarantee that "the server cannot impersonate users" and that "device keys are generated on the client device and private keys never leave the device." If the server accepts OTKs from anyone, a compromised account can silently intercept another user's incoming messages.

**Rule:** OTK and pre-key upload endpoints MUST verify that `req.user` owns the target device before accepting key material.

**Current violation:** `POST /device/:id/otk` in `src/devices/devices.routes.ts` passes `req.user!.userID` to `saveOTKs()`, but `saveOTKs()` in `src/keys/keys.service.ts` does not verify the device belongs to that user — it inserts OTKs for any device ID.

#### 2. Mail delivery failures must not be silent

The privacy policy states: "Mail is deleted from the server after it is fetched by the intended recipient." This means the server is a **relay** — messages pass through briefly and are gone. If a mail save fails silently, the sender believes the message was delivered, but it was dropped. The recipient never receives it. There is no second chance — the OTK was already consumed, the session state has advanced, and the message is gone forever.

Silent message loss is worse than a visible error. The user has no way to know the message was lost, no way to resend, and no audit trail.

**Rule:** Mail save failures MUST propagate as errors to the sender. Never swallow errors in the mail pipeline.

**Current violation:** `src/run.ts` line 45 — the WebSocket `onMail` handler calls `saveMail(db, result.data).catch(() => {})`, silently discarding all save errors.

#### 3. Invite join must be atomic

Server membership grants access to group channels and their encrypted message streams. If a race condition allows duplicate membership records or joining an expired invite, it undermines access control integrity.

**Rule:** The invite validation → membership check → permission creation sequence MUST run inside a database transaction.

**Current violation:** `POST /invite/:inviteID/join` in `src/servers/servers.routes.ts` performs three separate DB calls (`isInviteValid`, `hasPermission`, `createPermission`) without a transaction. Concurrent requests can bypass the membership check.

#### 4. Auth endpoints must have stricter rate limits

Login and registration endpoints are the only routes that accept passwords. The global rate limit (500 requests per 15 minutes) is far too permissive for credential-testing attacks. A dedicated attacker can attempt 500 passwords in 15 minutes per IP.

**Rule:** Auth endpoints (`POST /auth`, `POST /register`) MUST have a separate, tighter rate limit (e.g., 10 attempts per 15 minutes) applied at the router level, on top of the global limit.

**Current violation:** `src/app.ts` applies only `globalRateLimit` (500/15min). `src/auth/auth.routes.ts` has no `authRateLimit` middleware. The architecture doc's middleware order section already specifies this should exist — it was never implemented.

### What the server must NOT enforce (anti-patterns)

These are security measures that sound reasonable but would **violate the Vex privacy model** if implemented. They create surveillance infrastructure — the server gains knowledge about who talks to whom, or gains the ability to selectively deny service based on social graph information.

#### Do NOT add access control to device listing

`GET /user/:id/devices` MUST remain accessible to any authenticated user. This is a **protocol requirement**, not a missing access check.

X3DH key exchange requires the sender to fetch the recipient's device list and key bundle *before* sending the first message. If the server restricts device listing to "own devices only," no one can send anyone a message. If the server restricts it to "contacts only," the server is now maintaining a social graph — it knows who talks to whom. The privacy policy explicitly states that the server should not build profiles of users and their conversations.

Signal, Matrix, and every other E2E encrypted protocol with X3DH-style key exchange has open device/key bundle endpoints for the same reason.

#### Do NOT add server-side file access control

File uploads support a `nonce` field for client-side encryption metadata. The intended model is the same as mail: the server stores ciphertext, the client decrypts. If the server enforces "only the intended recipient can download this file," the server must track who each file is intended for — building a content-access graph that maps files to users.

The correct fix is to ensure files are **always client-encrypted** (enforce non-empty nonce on upload). Then any user downloading the file gets ciphertext they cannot decrypt without the session key, and the server has no knowledge of file contents or intended recipients.

#### Do NOT restrict user search

`GET /users/search?query=` returns public user profiles. Usernames in Vex are public identifiers — you need to find someone to message them. Restricting search would force users to exchange userIDs out-of-band, which defeats the purpose of a chat platform. Basic length validation on the query parameter is fine (prevent empty/absurdly long queries), but do not add contact-list gating.

---

## Learning Resources

### Start here (concepts)

| Topic | Resource |
|---|---|
| How HTTP works | [MDN: HTTP overview](https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview) |
| REST API basics | [MDN: HTTP methods](https://developer.mozilla.org/en-US/docs/Web/HTTP/Methods) |
| What is a JWT | [jwt.io introduction](https://jwt.io/introduction) |
| What is SQL | [SQLite Tutorial](https://www.sqlitetutorial.net/) — free, browser-based |
| What is async/await | [MDN: async function](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function) |

### The specific tools we use

| Tool | Docs | What to read |
|---|---|---|
| **TypeScript** | [typescriptlang.org/docs](https://www.typescriptlang.org/docs/handbook/intro.html) | Handbook: Basic Types, Interfaces, Generics |
| **Express 5** | [expressjs.com](https://expressjs.com/) | Guide: Routing, Middleware, Error handling |
| **Kysely** | [kysely.dev](https://kysely.dev) | Getting started, Transactions, Type safety |
| **Zod** | [zod.dev](https://zod.dev) | Basics, `z.infer`, Error handling |
| **Vitest** | [vitest.dev](https://vitest.dev) | Guide: Test API, `test.each`, `expect` |
| **TweetNaCl-js** | [GitHub README](https://github.com/dchest/tweetnacl-js) | `sign`, `sign.open`, `sign.keyPair` |

### Going deeper

| Topic | Resource |
|---|---|
| Node.js architecture | [nodejs.org guides](https://nodejs.org/en/learn) — especially event loop |
| Layered architecture | The `nodejs-best-practices` skill in `.claude/skills/` |
| Cryptography (non-maths) | *Serious Cryptography* by Jean-Philippe Aumasson — Chapter 1–5 cover the primitives we use |
| SQL joins and indexes | [Mode SQL Tutorial](https://mode.com/sql-tutorial) — free, excellent |
| OWASP security basics | [OWASP Top 10](https://owasp.org/www-project-top-ten/) — know what attacks look like |
| E2E encryption concepts | Signal Protocol overview (our model is similar) — [signal.org/docs](https://signal.org/docs/) |

### Understanding this codebase specifically

Read in this order:
1. `docs/vex-overview.md` — what Vex is, components, and cryptographic protocol
2. `docs/ops/` — start with `README.md`, then `journeys.md` (story map backbone), then `roadmap.md` (Now/Next/Later with stories and status)
3. `docs/platform-strategy.md` — cross-platform architecture (Tauri+Svelte desktop, React Native mobile, shared packages)
4. `docs/design-system.md` — Figma ↔ Storybook pipeline, Mitosis component strategy, designer/developer workflow
5. `docs/auth-comparison.md` — how auth works, our design decisions
6. `AGENTS.md` — implementation rules all contributors must follow
7. `docs/testing-strategy.md` — how tests are structured
8. `docs/logging.md` — pino logger setup, redaction, dev vs prod transport
9. `docs/config.md` — env validation, secret hygiene, singleton pattern
10. `docs/websocket.md` — WS connection lifecycle, auth handshake, async handler pattern
11. `src/db/types.ts` — all 11 database tables
12. `src/devices/devices.service.ts` + `src/devices/devices.schemas.ts` — the most complete implemented module, good pattern reference

---

See also: [packages.md](packages.md) for the shared packages dependency graph, [testing-strategy.md](testing-strategy.md) for test patterns, [vex-overview.md](vex-overview.md) for the cryptographic protocol.
