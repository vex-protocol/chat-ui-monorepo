# ADR-011: Platform Config Ownership — Store over SDK

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** @dream
**Supersedes:** `PlatformPreset` type and `tauriPreset()`/`expoPreset()` in `@vex-chat/libvex`

---

## Context

The original architecture had `@vex-chat/libvex` own the platform configuration
type (`PlatformPreset`) and ship platform-specific preset factories:

```
@vex-chat/libvex/
  preset/tauri.ts     → tauriPreset()    — BrowserWebSocket + TauriSqliteDialect
  preset/expo.ts      → expoPreset()     — BrowserWebSocket + ExpoDialect
  preset/node.ts      → nodePreset()     — NodeWebSocket + BetterSqlite3Dialect
  storage/tauri.ts    → createTauriStorage()
  storage/expo.ts     → createExpoStorage()
  storage/node.ts     → createNodeStorage()
```

This meant the SDK — a protocol library — had direct dependencies on
`@tauri-apps/plugin-sql`, `expo-sqlite`, `kysely-expo`, and other
platform-specific packages. These were isolated behind subpath exports to
avoid bundling issues, but the SDK still owned:

1. The `PlatformPreset` type definition
2. The preset factory functions
3. The platform-specific storage adapters

### Problems

**Inverted dependency.** The SDK should depend on abstractions (`IStorage`,
`IClientAdapters`), not on specific platforms. Shipping Tauri and Expo code
inside `libvex` means the SDK's release cycle is coupled to Tauri plugin
updates and Expo SDK bumps.

**Type ownership confusion.** `PlatformPreset` was defined in the SDK but
consumed by the store's `bootstrap()`. The store had to import a type from
its own dependency to define its own entry point — a circular conceptual
dependency.

**Preset duplication risk.** When the store introduced `VexService` and
`BootstrapConfig` (ADR-009), the SDK's presets became redundant. Two places
defined what a platform config looks like.

---

## Decision

Move platform configuration ownership to `@vex-chat/store`. The store defines
`BootstrapConfig`; apps implement it; the SDK knows nothing about it.

### BootstrapConfig (owned by store)

```typescript
// packages/store/src/service.ts

export interface BootstrapConfig {
    adapters: IClientAdapters;        // WebSocket class + logger (from libvex)
    createStorage(
        dbName: string,
        privateKey: string,
        logger: ILogger,
    ): Promise<IStorage>;
    deviceName: string;
}
```

### App implementations

**Desktop** (`apps/desktop/src/lib/platform.ts`):
```typescript
import { BrowserWebSocket } from "@vex-chat/libvex/transport/browser";

export function desktopConfig(): BootstrapConfig {
    return {
        adapters: { logger, WebSocket: BrowserWebSocket },
        async createStorage(dbName, privateKey, logger) {
            const { createTauriStorage } =
                await import("@vex-chat/libvex/storage/tauri");
            return createTauriStorage(dbName, privateKey, logger);
        },
        deviceName: navigator.platform,
    };
}
```

**Mobile** (`apps/mobile/src/lib/platform.ts`):
```typescript
import { BrowserWebSocket } from "@vex-chat/libvex/transport/browser";
import { Platform } from "react-native";

export function mobileConfig(): BootstrapConfig {
    return {
        adapters: { logger, WebSocket: BrowserWebSocket },
        async createStorage(dbName, privateKey, logger) {
            const { createExpoStorage } =
                await import("@vex-chat/libvex/storage/expo");
            return createExpoStorage(dbName, privateKey, logger);
        },
        deviceName: Platform.OS,
    };
}
```

### What stays in libvex

The SDK still ships the adapter implementations as subpath exports:

```
@vex-chat/libvex/transport/browser   → BrowserWebSocket
@vex-chat/libvex/transport/node      → NodeWebSocket
@vex-chat/libvex/storage/tauri       → createTauriStorage
@vex-chat/libvex/storage/expo        → createExpoStorage
@vex-chat/libvex/storage/node        → createNodeStorage
```

These are runtime implementations of `IClientAdapters` and `IStorage` — the
SDK provides them, but the store defines what it needs and apps wire it up.

### What was removed from libvex

- `PlatformPreset` type
- `tauriPreset()`, `expoPreset()`, `nodePreset()` factory functions
- No code was deleted from the storage/transport subpaths

---

## Dependency flow

```
Before:
  App → store (BootstrapConfig? no, PlatformPreset from libvex)
  App → libvex/preset/tauri (tauriPreset)
  store → libvex (PlatformPreset type)

After:
  App → store (BootstrapConfig type)
  App → libvex/transport/browser (BrowserWebSocket implementation)
  App → libvex/storage/tauri (createTauriStorage implementation)
  store → libvex (IClientAdapters, IStorage, ILogger — abstract interfaces only)
```

The store depends on libvex for abstract interfaces. Apps depend on libvex for
concrete implementations. The store never imports anything platform-specific.

---

## Consequences

### Positive

- **SDK is platform-agnostic.** `@vex-chat/libvex` defines `IStorage` and
  `IClientAdapters` but doesn't bundle Tauri or Expo code in its preset layer.
- **Store owns its contract.** `BootstrapConfig` is defined next to `VexService`
  where it's consumed, not in a downstream dependency.
- **Apps control their platform.** Each app decides exactly which WebSocket
  class, storage dialect, and device name to use. No preset magic.

### Negative

- **Slight duplication.** `desktopConfig()` and `mobileConfig()` have similar
  structure (logger, WebSocket, dynamic storage import). This is acceptable —
  each is ~15 lines and platform-specific enough to justify separate files.
- **Apps must know about libvex subpaths.** Apps import `BrowserWebSocket` and
  `createTauriStorage` from libvex subpath exports. This is a known coupling
  but it's explicit and type-checked.

---

## References

- [ADR-003: Thin-shell apps](./adr-003-thin-shell-apps.md) — "platform-specific code is injected, not imported"
- [ADR-004: Sibling repo migration](./adr-004-sibling-repo-migration.md) — adapter injection pattern
- [ADR-009: VexService facade](./adr-009-vexservice-facade.md) — `BootstrapConfig` consumer
