# WebSocket: Design and Patterns

How `src/ws/ws.service.ts` works and the decisions behind it.

---

## Connection Lifecycle

```
Client connects
    │
    ▼
Server sends 32-byte random challenge (crypto.getRandomValues)
    │
    ▼  (30-second window)
Client sends { type: 'auth', deviceID, signature }
    │
    ├── Expired? → ws.close()
    ├── Device not found? → ws.close()
    ├── Signature invalid? → ws.close()
    │
    ▼
Authenticated — client registered in Map<deviceID, WsLike>
    │
    ▼
5-second ping/pong heartbeat begins
    │
    ├── Pong received? → isAlive = true, continue
    └── No pong at next tick? → ws.close(), clearInterval
```

**Auth timeout (30s):** A client that connects but delays sending the auth message is rejected. This prevents stale challenge reuse and limits the window for brute-force timing of the handshake.

**Heartbeat pattern:** Set `isAlive = false` before each ping, reset to `true` on pong. If still false at the next tick, the TCP connection is dead — terminate it. Two ticks = 10-second maximum dead-connection detection.

---

## Async Handler Error Boundary

EventEmitter calls listeners **synchronously**. An `async` listener that rejects silently drops the error — depending on Node.js version and `--unhandled-rejections` mode, this can crash the process.

**Anti-pattern:**
```ts
ws.on('message', async (data) => {
  await db.query(...)  // if this throws → unhandled rejection
})
```

**Our pattern — extract + `.catch()` boundary:**
```ts
async function handleMessage(data: Buffer): Promise<void> {
  // ... all the logic, can throw freely
}

ws.on('message', (...args: unknown[]) => {
  handleMessage(args[0] as Buffer).catch(() => ws.close())
})
```

The `handleMessage` function throws freely. The `.catch()` at the listener level ensures any unexpected error closes the connection rather than crashing the process.

---

## The `WsLike` Interface (Testing Seam)

The connection manager never imports `ws` directly. It works against a minimal interface:

```ts
export interface WsLike {
  on(event: string, listener: (...args: unknown[]) => void): this
  send(data: Buffer | string): void
  close(code?: number): void
  ping(data?: Buffer): void
  readyState: number
}
```

This allows tests to use `MockWebSocket extends EventEmitter` with spy methods, with zero runtime dependency on the `ws` package. When `ws.Server` is wired up in `server.ts`, `ws.WebSocket` satisfies this interface structurally.

When `ws` is fully integrated, consider upgrading to typed event overloads using `@types/ws` — the current untyped `on(event: string, ...)` will catch misspelled event names at test runtime rather than compile time.

---

## Testing Async Handlers

The message handler is async (DB lookup inside), but `EventEmitter.emit()` is synchronous — it returns before the async work completes. Tests must drain the microtask queue after emitting a message:

```ts
// ws.test.ts — flushMicrotasks helper
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 15; i++) await Promise.resolve()
}
```

Why 15? Kysely's SqliteDialect over better-sqlite3 (synchronous driver) wraps results in a chain of already-resolved Promises. Each link in that chain costs one microtask hop. Measured minimum is 11 hops; 15 provides a comfortable buffer.

`Promise.resolve()` is a **microtask**, not a timer — it is unaffected by `vi.useFakeTimers()`. This is why the heartbeat tests (which use fake timers) can still call `connectAndAuth` safely before advancing the clock.

---

## Backpressure (Deferred)

The current `send()` implementation calls `ws.send(data)` unconditionally. This is fine at low volume. Under sustained load with slow or stalled clients, data accumulates in the TCP send buffer and memory grows without bound.

When building mail delivery, revisit:
- Check `ws.bufferedAmount` before queuing additional sends
- Listen for the underlying socket's `'drain'` event to resume delivery after the buffer clears
- Consider a per-client send queue with a max depth, dropping or disconnecting clients that fall too far behind

---

## Security Notes

| Concern | Status |
|---|---|
| Random challenge | ✅ `crypto.getRandomValues` — CSPRNG |
| Challenge scope | ✅ Per-connection closure — cannot replay on another connection |
| Auth window | ✅ 30-second expiry on the challenge |
| Signature algorithm | ✅ Ed25519 (NaCl) — modern, fast, no malleability |
| Timing safety | ✅ `nacl.sign.detached.verify` uses constant-time comparison |
| Message size | ✅ 2048-byte hard limit before any JSON parsing |
| Unhandled rejections | ✅ `.catch(() => ws.close())` boundary on async handler |
| Backpressure | ⏳ Deferred — needed before production under load |
| Cross-site WebSocket hijacking | ⏳ Validate `Origin` header in the HTTP upgrade handler (in `server.ts`) |

---

See also: [architecture.md](architecture.md) for the auth model and middleware order, [auth-comparison.md](auth-comparison.md) for NaCl challenge-response design, [vex-overview.md](../vex-overview.md) for the WS protocol overview.
