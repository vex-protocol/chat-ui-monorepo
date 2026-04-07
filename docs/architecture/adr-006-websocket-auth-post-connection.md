# ADR-006: Post-Connection WebSocket Authentication

**Status:** Accepted
**Date:** 2026-04-07
**Deciders:** @dgill
**Supersedes:** None

---

## Context

Vex Chat uses WebSocket connections for real-time messaging between clients and
the spire server. The original design authenticated WebSocket connections via
HTTP cookies on the upgrade request — the same `auth` JWT cookie used for REST
API calls was expected on the `Cookie` header of the WS upgrade.

This worked for browser-based clients (Tauri/Svelte desktop, web) because
browsers automatically include cookies on same-origin WebSocket upgrades. It
did not work for React Native.

### The React Native WebSocket Problem

We discovered through extensive debugging that iOS React Native WebSocket
connections cannot reliably pass authentication credentials on the HTTP upgrade
request:

| Mechanism | Browser/Tauri | Node.js (`ws`) | React Native iOS |
|-----------|--------------|----------------|------------------|
| `Cookie` header (automatic) | Works | Works (via options) | Does not send cookies on upgrade |
| Custom headers (3rd constructor arg) | N/A | Works | Supported but version-dependent iOS bugs |
| Query parameters (`?token=JWT`) | Works | Works | Metro bundler caching made this untestable; RN [Issue #16041](https://github.com/facebook/react-native/issues/16041) documents Android-specific issues |
| `Sec-WebSocket-Protocol` header | Works | Works | Android formatting bug ([Issue #45075](https://github.com/facebook/react-native/issues/45075)) |

Every mechanism that embeds credentials in the HTTP upgrade request has
platform-specific failure modes. The approaches we tried in order:

1. **Cookie header** — RN doesn't send cookies on WS upgrade
2. **Custom headers via `BrowserWebSocket` options** — RN may ignore the 3rd constructor arg depending on version
3. **Query parameter `?token=JWT`** — `express-ws` rewrote the URL to `/socket/.websocket`, stripping query params; after replacing `express-ws` with raw `ws`, RN's metro bundler served stale cached code, preventing verification
4. **`prependListener("upgrade")` to inject cookies** — worked for the raw `ws` server but didn't solve the client-side delivery problem

### The `express-ws` Problem

The spire server used `express-ws` to handle WebSocket routes. `express-ws`
(last released 2017, effectively unmaintained) internally rewrites upgrade URLs
by appending `/.websocket` to the path, which strips query parameters. This
made server-side fallback parsing impossible. We replaced `express-ws` with raw
`ws` using `noServer: true` as part of this change.

---

## Decision

Authenticate WebSocket connections **after** the connection is established, by
sending the JWT as the first WebSocket message. This is the same pattern used
by [Discord's Gateway](https://docs.discord.com/developers/events/gateway)
(Opcode 2 IDENTIFY).

### Protocol

1. Client connects to `ws://host/socket` — no credentials in URL, headers, or cookies
2. Server accepts the TCP upgrade unconditionally
3. Client sends `{ "type": "auth", "token": "<JWT>" }` as the first message
4. Server verifies the JWT:
   - **Valid** → creates `ClientManager`, proceeds with challenge/response flow
   - **Invalid** → sends `{ "type": "unauthorized" }` and closes the connection
5. If no auth message arrives within 5 seconds, server closes the connection

### Changes Made

**spire (server):**
- Removed `express-ws` dependency entirely
- Replaced with raw `ws` library (`WebSocketServer` with `noServer: true`)
- `server.on("upgrade")` accepts all connections, calls `wss.handleUpgrade()`
- `wss.on("connection")` waits for auth message with 5-second timeout
- `initApp()` type changed from `expressWs.Application` to `express.Application`
- All Express HTTP routes unchanged

**libvex-js (client):**
- `initSocket()` connects to bare `ws://host/socket` (no token in URL)
- On `open`, sends `JSON.stringify({ type: "auth", token: this.token })` before any other message
- `BrowserWebSocket` simplified — no longer attempts to pass headers
- Same code path for all platforms (Node, browser, Tauri, React Native)

**libvex-js (other fixes applied during this session):**
- `getUserDeviceList()` and `getMultiUserDeviceList()` filter out `deleted` devices
- `sendGroupMessage()` skips sender's own devices (forward already handles them)
- Ping interval cleared on WS close (prevents "Ping failed" spam after disconnect)

**vex-chat store (bootstrap.ts):**
- `cleanupStaleDevices()` — fire-and-forget after every successful login, deletes all of the current user's stale device registrations

---

## Alternatives Considered

### 1. Short-Lived Ticket Pattern (what Slack uses)

Client calls `POST /ws-ticket` with HTTP auth, gets a single-use ticket UUID,
connects with `ws://host/socket?ticket=<uuid>`. Server validates and consumes
the ticket on upgrade.

- **Pro:** Auth happens over standard HTTP; ticket in URL is harmless (ephemeral)
- **Con:** Requires server-side ticket store (Redis or in-memory with TTL), extra HTTP round-trip, more implementation complexity
- **Verdict:** Better security properties but more infrastructure. Could be adopted later if DoS becomes a concern.

### 2. Custom Headers via RN WebSocket Options

```js
new WebSocket(url, null, { headers: { Authorization: 'Bearer ...' } })
```

- **Pro:** Simplest, no protocol changes
- **Con:** Non-standard (browser WebSocket API doesn't support it), iOS SocketRocket has had bugs ([#38012](https://github.com/facebook/react-native/issues/38012)), not portable to web
- **Verdict:** Too fragile across RN versions. Rejected.

### 3. `Sec-WebSocket-Protocol` Header Trick

Pass the token as a WebSocket subprotocol.

- **Pro:** Works in browsers
- **Con:** Android formatting bug in RN ([#45075](https://github.com/facebook/react-native/issues/45075)), misuses the header's intended purpose, tokens appear in logs
- **Verdict:** Rejected due to Android bug and non-standard usage.

### 4. Keep `express-ws` with Workarounds

Inject cookies via `prependListener("upgrade")`.

- **Pro:** Minimal server changes
- **Con:** `express-ws` is unmaintained (2017), has TypeScript type conflicts, fragile listener ordering, doesn't solve the client-side credential delivery problem
- **Verdict:** Rejected. Removed `express-ws` entirely.

---

## Consequences

### Positive

- **Universal compatibility** — same auth flow on all platforms with zero branching
- **No token in URLs or logs** — credentials travel as WS data, not HTTP metadata
- **Removed dead dependency** — `express-ws` (unmaintained since 2017) replaced with raw `ws`
- **Simpler client code** — `BrowserWebSocket` no longer needs header passthrough logic
- **Proven pattern** — Discord Gateway uses identical post-connection auth

### Negative

- **Brief DoS surface** — server accepts unauthenticated connections for up to 5 seconds. Mitigated by timeout. Per-IP rate limiting should be added for production.
- **Custom protocol** — auth is not handled by standard HTTP mechanisms. Cannot use HTTP 401 status codes for auth failures.

### Build System Lesson

The `pnpm` workspace uses `"injected": true` for sibling repos (`libvex-js`,
`crypto-js`, `types-js`). This means pnpm copies the **built `dist/`** into
`node_modules` rather than symlinking source. Any source change in a sibling
repo requires:

```bash
cd ../libvex-js && npm run build   # rebuild dist/
pnpm install --force               # re-inject into node_modules
```

Metro watches source files via `watchFolders` in `metro.config.cjs`, but since
the app resolves from `dist/`, source file changes are invisible to metro until
the package is rebuilt and re-injected. This caused hours of debugging where
code changes appeared to have no effect.

---

## References

- [Discord Gateway Authentication](https://docs.discord.com/developers/events/gateway) — Opcode 2 IDENTIFY
- [Slack Socket Mode](https://docs.slack.dev/apis/events-api/using-socket-mode) — ticket-based pattern
- [websockets library docs](https://websockets.readthedocs.io/en/stable/topics/authentication.html) — "fully reliable and the most secure mechanism"
- [OWASP WebSocket Security](https://cheatsheetseries.owasp.org/cheatsheets/WebSocket_Security_Cheat_Sheet.html)
- [ws library `noServer` mode](https://github.com/websockets/ws/blob/master/doc/ws.md)
- [RN WebSocket query param issue #16041](https://github.com/facebook/react-native/issues/16041)
- [RN SocketRocket auth bug #38012](https://github.com/facebook/react-native/issues/38012)
- [RN Sec-WebSocket-Protocol bug #45075](https://github.com/facebook/react-native/issues/45075)
