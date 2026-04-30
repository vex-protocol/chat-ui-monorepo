# ADR-009: VexService Facade Pattern

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** @dream
**Supersedes:** `$client` atom + `bootstrap.ts` orchestration (pre-VexService architecture)

---

## Context

Before this change, the store package exposed the SDK's `Client` instance via a
`$client` nanostore atom. Apps imported `$client` directly and called SDK methods
on it — `$client.get()!.users.me()`, `$client.get()!.servers.create(name)`, etc.
A 360-line `bootstrap()` function in `bootstrap.ts` orchestrated client creation,
event wiring, waterfall HTTP fetches, and error handling.

This caused three problems:

1. **Leaky abstraction.** Apps depended on `Client`'s internal API surface. Any
   SDK change (method rename, parameter change, return type) rippled into every
   Svelte component and React screen that touched `$client`.

2. **No encapsulation of writes.** Any component could call `$client.get()!` and
   mutate server state. There was no chokepoint for logging, error handling, or
   state synchronization. Atoms were also freely writable from app code.

3. **God function.** `bootstrap.ts` grew to handle auth, event wiring, state
   population, error recovery, and credential management in a single function.
   Testing required mocking the entire Client class.

### Prior Art

- **TDLib (Telegram):** Apps interact with TDLib through a single `td_send` /
  `td_receive` interface. The client library is a black box — apps send requests
  and receive typed updates.
- **matrix-rust-sdk (Element):** The Rust SDK exposes a `Client` struct with
  high-level methods (`login`, `sync`, `send`). Platform bindings (Swift, Kotlin)
  wrap this, never exposing internal protocol types.
- **Discord:** Shared Flux stores expose actions and selectors, never raw API
  clients.

---

## Decision

Replace `$client` + `bootstrap()` with a `VexService` singleton class that
encapsulates all SDK access.

### Architecture

```
┌─────────────────────────────────────────────────────┐
│  Apps (Svelte / React Native)                       │
│  ─────────────────────────────────────────────────  │
│  Subscribe to readonly atoms: $user, $messages, ... │
│  Call vexService.login(), vexService.sendDM(), ...  │
│  Never import Client or writable atoms              │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│  VexService (singleton, packages/store/service.ts)  │
│  ─────────────────────────────────────────────────  │
│  private client: Client | null                      │
│  private wireEvents(): void                         │
│  public login(), register(), autoLogin()            │
│  public sendDM(), sendGroupMessage()                │
│  public createServer(), joinInvite(), ...           │
│  Writes to $userWritable, $messagesWritable, ...    │
└───────────────────────┬─────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────┐
│  Client (@vex-chat/libvex)                          │
│  SDK internals — WebSocket, NaCl, HTTP              │
└─────────────────────────────────────────────────────┘
```

### Key design choices

**Singleton, not dependency injection.** `vexService` is a module-level
`new VexService()` export. Apps import it directly. DI would add indirection
for no current benefit — there is exactly one identity per device. `logout()`
closes the Client and resets all atoms; the next `login()` creates a fresh
Client inside the same instance. Account switching works — just not
simultaneously.

**Private client.** The `Client` instance is a private field. No app code can
call `client.users.me()` or `client.mail.send()`. All SDK interactions are
mediated by named methods (`login`, `sendDM`, `createServer`).

**Auth methods accept BootstrapConfig.** Instead of constructing the Client
internally with hardcoded adapters, auth methods accept a `BootstrapConfig`
(see ADR-011) that provides platform-specific WebSocket, storage, and device
name. This keeps the service platform-agnostic.

**Writable atoms are internal.** Domain modules export both `$fooWritable`
(imported only by `service.ts`) and `$foo` (readonly, exported to apps via
`readonlyType()`). See ADR-010.

### Public API surface

The snippet below is illustrative. The source of truth is
`packages/store/src/service.ts` and exported public types in
`packages/store/src/index.ts`.

```typescript
class VexService {
    // Auth
    autoLogin(keyStore, config, options): Promise<AuthResult>
    login(username, password, config, options, keyStore): Promise<AuthResult>
    register(username, password, config, options, keyStore): Promise<AuthResult>
    logout(): Promise<void>

    // Messaging
    sendDM(recipientID, content): Promise<OperationResult>
    sendGroupMessage(channelID, content): Promise<OperationResult>
    markRead(conversationKey): void
    resetAllUnread(): void

    // Servers & channels
    createServer(name): Promise<CreateServerResult>
    deleteServer(serverID): Promise<OperationResult>
    createChannel(name, serverID): Promise<OperationResult>
    joinInvite(inviteID): Promise<OperationResult>
    createInvite(serverID, duration): Promise<IInvite>
    getInvites(serverID): Promise<IInvite[]>
    getChannelMembers(channelID): Promise<IUser[]>

    // User
    lookupUser(query): Promise<IUser | null>
    setAvatar(data: Uint8Array): Promise<OperationResult>
    close(): Promise<void>
}
```

---

## Migration

24 call sites across desktop and mobile were migrated:

| Before | After |
|--------|-------|
| `$client.get()!.users.me()` | Handled internally by `populateState()` |
| `$client.get()!.servers.create(name)` | `vexService.createServer(name)` |
| `$client.get()!.mail.send(recipientID, content)` | `vexService.sendDM(recipientID, content)` |
| `bootstrap(url, id, key, token, preKey, persistence)` | `vexService.autoLogin(keyStore, config, options)` |
| `$messages.setKey(key, [...prev, msg])` | Handled internally by event wiring |

The `$client` atom, `bootstrap.ts`, `reset.ts`, `send-dm.ts`,
`send-group-message.ts`, and 15 single-atom files were all deleted.

---

## Consequences

### Positive

- **Single API surface.** Apps depend on ~20 named methods, not the full Client
  API. SDK changes are absorbed in `service.ts` without touching app code.
- **Centralized error handling.** Every method returns `AuthResult` or
  `OperationResult` with an `ok` boolean and optional `error` string. Apps
  never catch raw SDK exceptions.
- **Testable.** The service can be tested by calling methods and asserting atom
  state — no UI mounting required.
- **Write protection.** Apps cannot accidentally mutate state. The
  `readonlyType()` wrapper makes writable atoms type-error on `.set()`.

### Negative

- **Indirection.** Debugging requires tracing through `service.ts` to reach SDK
  calls. Mitigated by keeping methods small (most are 5-15 lines).

---

## References

- [ADR-003: Thin-shell apps](./adr-003-thin-shell-apps.md) — the principle that
  apps should be pure view layers
- [ADR-010: Domain atom consolidation](./adr-010-domain-atom-consolidation.md)
- [ADR-011: Platform config ownership](./adr-011-platform-config-ownership.md)
- [Telegram TDLib architecture](https://core.telegram.org/tdlib)
- [nanostores `readonlyType`](https://github.com/nanostores/nanostores#readonly-type)
