# ADR-010: Domain Atom Consolidation + Readonly Boundaries

**Status:** Accepted
**Date:** 2026-04-09
**Deciders:** @dream
**Supersedes:** 18 single-atom files in `packages/store/src/`

---

## Context

The store package originally had one file per atom — `user.ts`, `familiars.ts`,
`messages.ts`, `servers.ts`, `channels.ts`, `permissions.ts`, `devices.ts`,
`onlineLists.ts`, `avatarHash.ts`, `key-replaced.ts`, plus `unread.ts`,
`verifiedKeys.ts`, and supporting files like `client.ts`, `reset.ts`,
`send-dm.ts`, `send-group-message.ts`.

This created two problems:

1. **18 files for 15 atoms.** Each file was 6-9 lines — an `import`, a `map()`
   or `atom()` call, and an `export`. The file tree was flat and noisy.
   Navigation required scanning 18+ files to find related state.

2. **No write protection.** Every atom was exported as a writable `map()` or
   `atom()`. Any app component could call `$servers.setKey(id, server)` or
   `$user.set(null)`, bypassing the store's orchestration layer. This made it
   impossible to reason about state transitions — any file in any app could
   mutate any atom at any time.

---

## Decision

### 1. Consolidate atoms into domain modules

Group atoms by domain into three files:

```
packages/store/src/domains/
  identity.ts    — $user, $familiars, $devices, $avatarHash, $keyReplaced
  messaging.ts   — $messages, $groupMessages, $dmUnreadCounts, $channelUnreadCounts,
                   $totalDmUnread (computed), $totalChannelUnread (computed)
  servers.ts     — $servers, $channels, $permissions, $onlineLists
```

Each domain module is self-contained — related atoms live together, making it
easy to see the full shape of each state slice.

### 2. Writable/readonly split via `readonlyType()`

Each domain module exports two versions of every atom:

```typescript
// domains/identity.ts

// Writable — only VexService imports these
export const $userWritable = atom<IUser | null>(null);
export const $familiarsWritable = map<Record<string, IUser>>({});

// Readable — components subscribe to these
export const $user = readonlyType($userWritable);
export const $familiars = readonlyType($familiarsWritable);
```

**Who imports what:**

| Consumer | Imports | Can write? |
|----------|---------|------------|
| `service.ts` (VexService) | `$userWritable`, `$familiarsWritable`, ... | Yes |
| App components | `$user`, `$familiars`, ... (via `index.ts`) | No (TypeScript error) |

The `readonlyType()` wrapper from nanostores strips `.set()` and `.setKey()`
from the type signature. Attempting to write produces a compile-time error:

```typescript
import { $user } from '@vex-chat/store'
$user.set(null)  // TS error: Property 'set' does not exist on type 'ReadonlyAtom<...>'
```

### 3. Barrel exports only readonly atoms

`packages/store/src/index.ts` exports only the readonly versions:

```typescript
export { $user, $familiars, $devices, $avatarHash, $keyReplaced } from "./domains/identity.ts";
export { $messages, $groupMessages, $dmUnreadCounts, ... } from "./domains/messaging.ts";
export { $servers, $channels, $permissions, $onlineLists } from "./domains/servers.ts";
```

The `$fooWritable` atoms are never exported from the package. They exist only
as internal implementation details of the domain modules, imported solely by
`service.ts`.

---

## Consequences

### Positive

- **3 files instead of 18.** Domain grouping makes the state shape scannable.
- **Compile-time write protection.** Apps cannot accidentally mutate state.
  All writes go through VexService, which provides error handling and
  consistency guarantees.
- **Clear ownership.** If an atom's value is wrong, there is exactly one place
  to look: `service.ts`. No hunting through 15+ app files for rogue `.set()` calls.

### Negative

- **`$fooWritable` naming convention.** The `Writable` suffix is not enforced
  by the type system — it's a naming convention. A developer could import
  from `./domains/identity.ts` directly instead of through `index.ts` and get
  the writable version. This is mitigated by the clear module comment
  ("only VexService imports these") and code review.

---

## References

- [ADR-009: VexService facade](./adr-009-vexservice-facade.md)
- [nanostores `readonlyType` API](https://github.com/nanostores/nanostores#readonly-type)
