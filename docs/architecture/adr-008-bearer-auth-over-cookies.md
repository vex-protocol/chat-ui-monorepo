# ADR-008: Bearer Token Auth Over Cookies

**Status:** Proposed
**Date:** 2026-04-07
**Deciders:** @dgill

---

## Context

The vex-chat client SDK (`@vex-chat/libvex`) currently uses HTTP cookies for
session authentication. After `login()`, the server responds with both:

1. A `Set-Cookie: auth=<JWT>` header
2. A `{ user, token }` JSON body

The client stores the cookie and forwards it on subsequent requests. This
creates three problems:

### Problem 1: Platform inconsistency

Cookie handling differs across platforms:

| Platform | Cookie behavior |
|----------|----------------|
| **Node.js** | No cookie jar. Client manually reads `Set-Cookie`, stores in an array, sets `ax.defaults.headers.cookie` globally |
| **Browser/Tauri** | Automatic via `XMLHttpRequest` cookie jar |
| **React Native** | Partial — `fetch` has cookies but WebSocket does not (ADR-006) |

This requires platform-specific code (`isNode` check in `addCookie`) and was
the root cause of the WebSocket auth failure on React Native that led to
ADR-006 (post-connection auth).

### Problem 2: Global state prevents multi-client testing

`addCookie` sets `ax.defaults.headers.cookie` — a **process-global** setting
on the shared axios instance. When two Client instances exist in the same
process (e.g., integration tests with `clientA` and `clientB`), the second
login overwrites the first's cookie. All subsequent requests from `clientA`
carry `clientB`'s credentials.

This is why the multi-device test in `Client.ts` is commented out:

```typescript
// cookies get overwritten for all three when you set the device or user cookie.
```

This blocks testing of:
- Two-user direct messaging (full X3DH key exchange)
- Multi-device message sync
- Device management (register/delete second device)
- Any scenario requiring concurrent authenticated clients

### Problem 3: Inconsistency with WebSocket auth

ADR-006 moved WebSocket authentication to a post-connection message:
`{ type: "auth", token: "<JWT>" }`. This is Bearer-style auth — the token
is sent explicitly, not via cookies. HTTP requests still use cookies, creating
two different auth mechanisms in the same client.

---

## Decision

Replace cookie-based HTTP authentication with `Authorization: Bearer <token>`
headers throughout the client SDK. The server accepts both mechanisms during
migration.

### Protocol change

```
Before:
  Client → Server: Cookie: auth=<JWT>

After:
  Client → Server: Authorization: Bearer <JWT>
```

### Client changes (libvex-js)

1. **Per-client axios instance** — each `Client` creates its own `axios.create()`
   instead of using the global `ax` import. This isolates auth state between
   instances.

2. **Bearer header after login** — `login()` and `loginWithDeviceKey()` set
   `this.ax.defaults.headers.common.Authorization = "Bearer " + token` on the
   per-client instance.

3. **Delete cookie machinery** — remove `addCookie()`, `getCookies()`,
   `this.cookies[]`, and the `isNode` check. These become unnecessary.

4. **Delete `browser-or-node`** — the only remaining use was `isNode` for
   cookie forwarding. Already inlined; can now be removed entirely.

### Server changes (spire)

1. **Replace cookie auth with Bearer** — `checkAuth` middleware reads from
   `Authorization: Bearer` header only:

   ```typescript
   const token = req.headers.authorization?.replace("Bearer ", "");
   ```

2. **Remove `cookie-parser`** — no longer needed. Remove `res.cookie()` calls
   from login, register, goodbye, and device-key auth endpoints.

3. **Login response** — return `{ user, token }` in the body only. No
   `Set-Cookie` header.

### Test impact

- **Multi-client tests unblocked** — each Client has its own axios instance
  with its own `Authorization` header. Two clients in the same process no
  longer interfere.
- **Platform tests simplified** — no cookie simulation needed in test
  transports. The `getAxiosCookies()` helper and cookie-forwarding logic in
  `NodeTestWS` / `BrowserTestWS` become dead code.
- **New tests enabled:**
  - Two-user direct messaging (full X3DH exchange between different users)
  - Group messaging (multiple users in a channel)
  - Multi-device sync (same user, two Client instances)
  - `loginWithDeviceKey()` (ADR-007)
  - Session verification (mnemonic comparison between two users)

---

## Alternatives Considered

### Keep cookies, use per-client axios instances

Create `axios.create()` per Client but continue using cookies via a per-instance
cookie jar (e.g., `tough-cookie` or manual jar).

- **Pro:** No server changes
- **Con:** Cookie jars are complex (domain matching, path scoping, expiry),
  add a dependency, and don't work the same across platforms. Solving the
  wrong problem — the issue isn't cookie isolation, it's that cookies are the
  wrong mechanism for a cross-platform SDK.

### Keep cookies, fix the global state

Store cookies on the Client instance instead of `ax.defaults`. Forward them
per-request via axios interceptors.

- **Pro:** No server changes, no protocol change
- **Con:** Still requires `isNode` branching, still has platform-specific
  cookie handling, doesn't simplify the codebase

---

## Consequences

### Positive

- **Platform-agnostic** — identical auth code on Node, browser, Tauri, and RN
- **Multi-client safe** — per-instance axios with per-instance Bearer token
- **Simpler Client.ts** — removes ~30 lines of cookie handling code
- **Consistent with WS auth** — both HTTP and WS use explicit token delivery
- **Unblocks test coverage** — multi-user and multi-device tests become possible
- **Aligns with auth-comparison.md** — already documented as the target pattern

### Negative

- **Breaking change** — all clients must update simultaneously with the server.
  No backward compatibility period. This is acceptable because vex-chat
  controls both the server and all clients.

### Implementation order

1. Spire: replace `checkAuth` with Bearer-only, remove `cookie-parser`,
   remove all `res.cookie()` calls
2. Client.ts: per-client axios instance, Bearer header, delete cookie code
3. Delete test transport cookie simulation
4. Add multi-client integration tests

---

## References

- ADR-006: Post-Connection WebSocket Authentication — established token-as-data pattern
- ADR-007: Device-Key Auto-Login — issues JWT that needs to be forwarded
- `docs/explanation/auth-comparison.md` — "SDK sends Bearer; spire accepts both"
- `src/__tests__/Client.ts:281` — cookie overwrite comment blocking multi-device tests
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
