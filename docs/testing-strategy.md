# Testing Strategy for vex-chat/spire

Best practices and conventions for testing `apps/spire` with Vitest, Kysely, and Express.

---

## Directory Structure

```
apps/spire/
  src/                          ← production code only
    auth/
      __tests__/auth.test.ts    ← unit tests co-located with the domain they test
      auth.service.ts           ← service functions (registerUser, loginUser, etc.)
      auth.schemas.ts           ← Zod schemas + inferred types
    devices/
      __tests__/devices.test.ts
      devices.service.ts        ← service functions (createDevice, deleteDevice, etc.)
      devices.schemas.ts        ← Zod schemas + inferred types
    db/
      __tests__/migrations.test.ts
      index.ts                  ← thin public API barrel (re-exports Database type)
      types.ts                  ← Kysely Database interface — single source of truth
      migrate.ts                ← migrateToLatest / migrateDown
      migrations/               ← one file per schema change, numbered sequentially
    errors.ts                   ← domain error classes (ConflictError, NotFoundError, etc.)
    routes/                     ← [not yet implemented — vex-chat-ekb]
    app.ts                      ← buildApp(db) factory — no listen()  [vex-chat-63b]
    server.ts                   ← calls app.listen(), never imported by tests  [vex-chat-63b]
  test/                         ← test-only code, never in production build
    helpers/
      db.ts                     ← createTestDb(), useDb()
      factories.ts              ← test data builders (users, devices, etc.)
    setup.ts                    ← vitest setupFiles entry point
  package.json                  ← "imports" field defines all path aliases
  vitest.config.ts              ← mirrors package.json imports for Vitest resolution
  tsconfig.json                 ← includes src/** + test/** (for type checking)
  tsconfig.build.json           ← includes src/** only (production build)
```

---

## Core Rules

1. **No test code in production source.** `src/` contains only production code. Test helpers, factories, and fixtures live in `test/`.
2. **No `listen()` in `src/app.ts`.** The app is a factory (`buildApp(db)`). Only `src/server.ts` calls `listen()`. Tests never import `server.ts`.
3. **Close beads only after the user commits.** Never run `git add`, `git commit`, or `git push`.

---

## Why `createTestDb()` Must Not Live in `src/`

- **Bundle pollution** — `better-sqlite3` is a native addon. Exporting it from a production module risks pulling it into production images.
- **Misleading API** — it appears in IDE autocomplete everywhere `src/db` is imported, implying an in-memory DB is a valid runtime option.
- **Principle of least surprise** — production modules contain only production code.

---

## Test Helpers

### `test/helpers/db.ts`

```ts
import { onTestFinished } from 'vitest'
import SQLiteDatabase from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import type { Database } from '../../src/db/types.js'
import { migrateToLatest } from '../../src/db/migrate.js'

/** Bare in-memory Kysely instance — no schema. */
export function createTestDb(): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new SqliteDialect({ database: new SQLiteDatabase(':memory:') }),
  })
}

/**
 * Migrated in-memory DB that auto-destroys after the current test.
 * Preferred for integration tests — call once per test, no afterEach needed.
 *
 * @example
 * it('creates a user', async () => {
 *   const db = await useDb()
 *   // db is fully migrated and will be destroyed after this test
 * })
 */
export async function useDb(): Promise<Kysely<Database>> {
  const db = createTestDb()
  await migrateToLatest(db)
  onTestFinished(() => db.destroy())
  return db
}
```

`onTestFinished` is a Vitest v2+ hook — cleanup is registered inline with the helper, so tests never need a matching `afterEach`.

### `test/setup.ts`

Global setup that runs before every test file (via `setupFiles` in vitest.config.ts).

```ts
process.env['NODE_ENV'] = 'test'
process.env['LOG_LEVEL'] = 'silent'
```

---

## Vitest Configuration

### `vitest.config.ts`

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',

    // REQUIRED for better-sqlite3 and any native addon.
    // pool: 'threads' causes segfaults with native modules because they
    // are not built to be thread-safe. 'forks' uses child_process instead
    // of worker_threads — each worker gets its own process memory space.
    // Vitest changed the default to 'forks' in v2 for exactly this reason.
    pool: 'forks',

    setupFiles: ['./test/setup.ts'],

    // Import test helpers without fragile relative paths
    alias: {
      '#test': new URL('./test', import.meta.url).pathname,
    },
  },
})
```

### `pool: 'forks'` vs `pool: 'threads'`

| | `forks` | `threads` |
|---|---|---|
| Mechanism | `node:child_process` | `node:worker_threads` |
| Native addons safe | Yes | No (segfaults) |
| Memory isolation | Full | Shared heap |
| Speed | Slightly slower startup | Faster startup |
| Vitest v2+ default | Yes | No |

**Always use `pool: 'forks'` when `better-sqlite3` is in the dep tree.**

---

## TypeScript Build Configuration

### `tsconfig.json` (development — includes test files for type checking)

Extends root workspace tsconfig. Includes both `src/**` and `test/**` so test helper imports type-check correctly.

### `tsconfig.build.json` (production — excludes test files)

```json
{
  "extends": "./tsconfig.json",
  "include": ["src/**/*"],
  "exclude": ["src/**/*.test.ts", "test/**/*"]
}
```

Add to `package.json`:
```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json",
    "typecheck": "tsc --noEmit"
  }
}
```

---

## Database Testing Patterns

### Integration tests — use `useDb()`

For tests that exercise real SQL (migrations, queries, constraints):

```ts
import { describe, it, expect } from 'vitest'
import { useDb } from '#test/helpers/db.js'

describe('users', () => {
  it('rejects duplicate usernames', async () => {
    const db = await useDb()
    await db.insertInto('users').values({ userID: '1', username: 'alice', ... }).execute()
    await expect(
      db.insertInto('users').values({ userID: '2', username: 'alice', ... }).execute()
    ).rejects.toThrow()
  })
})
```

### Unit tests — mock at the service boundary

For tests that don't need a real DB, mock the service layer (not Kysely itself):

```ts
import { vi, it, expect } from 'vitest'
import { findUser } from '../src/users/service.js'

const mockDb = { selectFrom: vi.fn().mockReturnThis(), ... } as any

it('returns null for unknown user', async () => {
  const result = await findUser(mockDb, 'ghost')
  expect(result).toBeNull()
})
```

### `beforeAll` vs `beforeEach`

- **`beforeEach` + `useDb()`** — preferred for most tests. Each test gets an isolated DB. SQLite `:memory:` creation costs ~1ms.
- **`beforeAll`** — only when the test suite is read-only (no mutations) and DB setup is expensive. Not needed for in-memory SQLite.

---

## Express Testing Pattern

### App factory

```ts
// src/app.ts
export function buildApp(db: Kysely<Database>): Express {
  const app = express()
  app.use(express.json())
  // mount routers...
  return app
}

// src/server.ts (never imported by tests)
const db = createDb()
buildApp(db).listen(config.API_PORT)
```

### HTTP integration tests with supertest

```ts
import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { buildApp } from '../../src/app.js'
import { useDb } from '#test/helpers/db.js'

describe('POST /register', () => {
  it('creates a user', async () => {
    const db = await useDb()
    const app = buildApp(db)

    const res = await request(app)
      .post('/register')
      .send({ username: 'alice', password: 'hunter2hunter2' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({ username: 'alice' })
  })
})
```

---

## Testing NaCl Crypto

The full-fidelity privacy model requires Ed25519 key pairs in tests. Use `@vex-chat/crypto` — it wraps `@noble/curves` with NaCl-compatible wire format.

### Generating key pairs

```ts
import { generateSignKeyPair, signMessage, encodeHex } from '@vex-chat/crypto'

const keyPair = generateSignKeyPair()
// keyPair.publicKey  → Uint8Array(32)
// keyPair.secretKey  → Uint8Array(32) — seed, not the 64-byte expanded key
```

### Signing a token UUID for registration

The registration token is a UUID string. To sign it:

```ts
import { parse as uuidParse } from 'uuid'

const tokenBytes = uuidParse(token.key) as Uint8Array  // 16 bytes
const signedMessage = signMessage(tokenBytes, keyPair.secretKey) // 80 bytes: 64-byte sig + 16-byte msg
```

### Verifying and deriving userID

```ts
import { stringify as uuidStringify } from 'uuid'
import { verifyNaClSignature } from '@vex-chat/crypto'

const regKey = verifyNaClSignature(signedMessage, keyPair.publicKey) // → 16 bytes or null
const userID = uuidStringify(regKey!)  // = token.key (the original UUID)
```

The userID is always equal to the original registration token UUID. This is the key insight: the server issued the UUID, but the client cryptographically bound their device key to it.

### Test factories: `test/helpers/factories.ts`

All shared test data builders live in one file. This avoids helper fragmentation and
incompatible `seedUser` signatures across test files.

```ts
import { seedUser, makeRegistrationPayload, makeDevicePayload } from '#test/helpers/factories.js'
```

**`seedUser(db, userID?)`** — direct DB insert, returns userID string. No auth stub dependency.
Use in device, mail, and other domain tests that just need a user to exist.

**`makeDevicePayload(overrides?)`** — generates a fresh NaCl key pair and returns `DevicePayload`.

**`makeRegistrationPayload(token, keyPair, overrides?)`** — uses `nacl.sign.open` directly
(not the `verifyNaClSignature` stub) so setup succeeds before auth is implemented.

The loginUser test block in `auth.test.ts` defines its own local `seedUser` that calls
`registerUser` — this is intentional, as it tests the full auth flow rather than just
inserting a row.

#### `makeRegistrationPayload` factory pattern

```ts
import nacl from 'tweetnacl'
import { parse as uuidParse } from 'uuid'
import { encodeHex, verifyNaClSignature } from '../../src/auth/index.js'
import type { IActionToken, RegistrationPayload } from '../../src/auth/index.js'

export function makeRegistrationPayload(
  token: IActionToken,
  keyPair: nacl.SignKeyPair,
  overrides?: Partial<RegistrationPayload>,
): { regKey: Uint8Array; payload: RegistrationPayload } {
  const tokenBytes = uuidParse(token.key) as Uint8Array
  const signedMessage = nacl.sign(tokenBytes, keyPair.secretKey)
  const preKeyPair = nacl.sign.keyPair()
  const preKeySignature = nacl.sign(preKeyPair.publicKey, keyPair.secretKey)
  const regKey = verifyNaClSignature(signedMessage, keyPair.publicKey)!

  return {
    regKey,
    payload: {
      username: 'alice',
      password: 'password123',
      signKey: encodeHex(keyPair.publicKey),
      signed: encodeHex(signedMessage),
      preKey: encodeHex(preKeyPair.publicKey),
      preKeySignature: encodeHex(preKeySignature),
      preKeyIndex: 0,
      deviceName: 'test-device',
      ...overrides,
    },
  }
}
```

### `test.each` for validation matrices

Use `test.each` instead of loops for invalid-input tests. Each case runs as a separate
named test, giving per-case failure granularity in CI output.

```ts
test.each([
  ['ab', 'too short (< 3 chars)'],
  ['a'.repeat(20), 'too long (> 19 chars)'],
  ['ali ce', 'contains space'],
])('rejects invalid username "%s" — %s', async (username) => {
  const db = await useDb()
  const store = createTokenStore()
  const t = store.create('register')
  const { regKey, payload } = makeRegistrationPayload(t, nacl.sign.keyPair(), { username })
  await expect(registerUser(db, regKey, payload)).rejects.toThrow()
})
```

### `pool: 'forks'` is still required

`tweetnacl` is pure JS (no native addon) so it does not affect the pool setting. `better-sqlite3` still requires `pool: 'forks'`.

---

## Import Alias

Use `#test/helpers/db.js` instead of fragile relative paths like `'../../../test/helpers/db.js'`.

Configure in both `vitest.config.ts` (runtime) and `tsconfig.json` (type checking):

```json
// tsconfig.json compilerOptions
{
  "paths": {
    "#test/*": ["./test/*"]
  }
}
```

```ts
// vitest.config.ts
alias: {
  '#test': new URL('./test', import.meta.url).pathname,
}
```

Usage in tests:
```ts
import { useDb } from '#test/helpers/db.js'
```
