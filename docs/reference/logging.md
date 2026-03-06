# Logging: Pino Setup and Best Practices

Explains how `src/utils/logger.ts` is structured and why.

---

## Factory Pattern: `createLogger(service)`

```ts
// src/utils/logger.ts
const root = pino({ level, redact, transport })

export function createLogger(service: string): pino.Logger {
  return root.child({ service })
}
```

**Why `root.child({ service })` instead of `pino()` per call:**

- All children share the root's destination stream, transport, level, and redact config. No stream proliferation.
- Child creation is ~1.5x faster than allocating a new pino instance (child reuses root's serializer registry and prototype chain).
- `logger.bindings()` on the child returns `{ service: '...' }`, making it trivially testable.

**What not to do:**

```ts
// ❌ Creates a fresh pino instance on every call — different stream, no shared config
export function createLogger(service: string) {
  return pino({ level, transport }).child({ service })
}
```

---

## Dev vs Production Transport

```ts
const isDev = process.env['NODE_ENV'] !== 'production'

const root = pino({
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
    : undefined, // raw JSON to stdout
})
```

**`pino-pretty` is a `devDependency`**, not a regular dependency. It is absent from the production Docker image. If `transport: { target: 'pino-pretty' }` is evaluated in production, the process crashes. The `isDev` guard prevents this.

**Production setup:** `transport: undefined` emits raw NDJSON to stdout. The log aggregator (Datadog, Loki, CloudWatch, etc.) handles parsing, formatting, and retention. This is the setup recommended by the pino maintainers for containerized apps ([pino issue #1491](https://github.com/pinojs/pino/issues/1491)).

**`pino/file` (worker thread) vs `pino.destination` (main thread):** If file output is ever needed, use `transport: { target: 'pino/file', options: { destination: './logs/app.log' } }`. Never use `pino.destination` in production — it writes on the main thread and blocks the event loop.

---

## Redaction

Sensitive fields are listed in the `redact.paths` array. Pino uses [`fast-redact`](https://github.com/pinojs/redact) to replace matching values with `[REDACTED]` before the log line is serialized to JSON — zero allocation overhead.

**Path syntax:** ECMAScript dot/bracket notation. Wildcards (`*`) match any key at that depth but are depth-sensitive: `'*.password'` matches `req.body.password` but NOT `req.body.user.creds.password`.

**Current redaction list** (`src/utils/logger.ts`):
```ts
paths: [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  'req.headers["x-auth-token"]',
  '*.password',
  '*.passwordHash',
  '*.token',
  '*.accessToken',
  '*.refreshToken',
  '*.secret',
  '*.apiKey',
]
```

**Security note:** Redaction is a last line of defence — the primary control is to never log objects that may contain sensitive data in the first place. Extract only the fields you need before passing them to the logger:

```ts
// ✅ — log only safe fields
logger.info({ userId: req.user.id, method: req.method }, 'Request')

// ❌ — may contain password, token, etc.
logger.info({ body: req.body }, 'Request body')
```

**Warning from pino docs:** Never allow user input to define redacted paths — this is a path traversal vector.

---

## Level Management

The log level is read once from `process.env['LOG_LEVEL']` at startup. It is not re-read on subsequent `createLogger()` calls.

**Changing level at runtime:** `root.level = 'debug'` works, but **does not propagate to already-created children** — their level was snapshotted at child creation time. This is a known pino limitation ([issue #2130](https://github.com/pinojs/pino/issues/2130)).

Options if dynamic level control is needed:
1. Maintain a registry of all children and iterate when level changes.
2. Use [`pino-arborsculpture`](https://github.com/pinojs/pino-arborsculpture) — the official pino companion for dynamic level management via file watching.

---

## `pino-http` Integration (when routes are implemented)

Pass the shared root logger to `pino-http`. It will create a per-request child logger automatically, attached to `req.log`:

```ts
import pinoHttp from 'pino-http'
import { rootLogger } from '#utils/logger.js'

// In buildApp():
app.use(pinoHttp({
  logger: rootLogger,
  genReqId: req => req.headers['x-request-id'] ?? crypto.randomUUID(),
}))

// In route handlers:
app.get('/messages', (req, res) => {
  req.log.info({ userId: req.user?.id }, 'Fetching messages')
  // ...
})
```

`pinoHttp` creates a child of `rootLogger` for each request, inheriting all root config (level, redact, serializers, transport). On response finish, it emits a single log line with method, URL, status, and response time.

---

## Testing Loggers

**Testing bindings (fast, synchronous):**

```ts
it('binds service name', () => {
  const logger = createLogger('auth')
  expect(logger.bindings()).toMatchObject({ service: 'auth' })
})
```

**Testing log output (integration tests):** Add `pino-test` if you need to assert on emitted JSON:

```ts
import { sink, once } from 'pino-test'

it('logs with service binding', async () => {
  const stream = sink()
  const root = pino(stream)
  const child = root.child({ service: 'auth' })
  child.info('hello')
  const log = await once(stream)
  expect(log.service).toBe('auth')
  expect(log.msg).toBe('hello')
})
```

**When using transports in tests:** Do not use `transport:` options when testing — worker threads can conflict with Vitest's module isolation. Write to a sink stream directly as above. In `test/setup.ts`, `LOG_LEVEL` is set to `'silent'` which suppresses all output.

---

See also: [config.md](config.md) for env validation (including `LOG_LEVEL`), [testing-strategy.md](testing-strategy.md) for test setup patterns, [architecture.md](architecture.md) for middleware order.
