# Platform Strategy

Vex is a cross-platform chat application targeting desktop and mobile.

---

## Stack

| Platform | Shell | UI Framework | Notes |
|---|---|---|---|
| Desktop | **Tauri 2.0** | **Svelte** | Replaces the original Electron+React `vex-desktop` |
| Mobile | **React Native** | React Native | Best native performance for chat (scrolling, gestures, real-time) |

### Why Tauri + Svelte for desktop

- Tauri uses the OS webview — smaller binary, lower memory than Electron
- Svelte compiles away the framework — smaller bundle, faster rendering in a webview
- Tauri has first-class Svelte scaffolding

### Why React Native for mobile (not Tauri mobile)

- Tauri 2.0 mobile runs a webview — janky on Android for long lists and rapid updates
- React Native renders actual native views — smooth scrolling, proper gestures
- Discord itself uses React Native for mobile
- A chat app needs performant virtual lists and real-time updates — native rendering wins

### Why not share UI components directly

Svelte components use DOM elements + CSS. React Native uses `View` + `StyleSheet`. Forcing them together through abstraction layers (like react-native-web in reverse) creates something worse on both platforms. Write the UI twice; share everything else.

---

## Monorepo Structure

```
packages/
  types/          — shared TypeScript interfaces, enums, constants (@vex-chat/types)
  crypto/         — NaCl encryption logic (@vex-chat/crypto)
  libvex/         — client SDK: WebSocket, auth, mail, devices, servers (@vex-chat/libvex)
  store/          — nanostores atoms: state slices + bootstrap + VexClient event wiring (@vex-chat/store)
  ui/             — Mitosis design primitives (.lite.tsx) (@vex-chat/ui)
    output/svelte/ — compiled Svelte components (used by desktop)
    output/react/  — compiled React components (used by mobile)
    stories/       — Storybook stories for all primitives
apps/
  spire/          — server (Node.js, Express, Kysely)
  desktop/        — Tauri + Svelte; @vex-chat/store atoms + @nanostores/svelte + packages/ui/output/svelte
  mobile/         — React Native (bare); @vex-chat/store atoms + @nanostores/react + packages/ui/output/react
```

Use **Turborepo** or **Nx** for monorepo orchestration (build ordering, caching, task pipelines).

---

## What Gets Shared

### 100% shared (framework-agnostic TypeScript)

- **types** — all interfaces, enums, API payload shapes
- **crypto** — NaCl encryption, key management, session establishment
- **libvex** — client SDK (WebSocket, auth, message protocol) — returns typed discriminated union results; no client-side pre-validation needed
- **store** — nanostores atoms per state slice; wraps VexClient events via `onMount`, runs the bootstrap sequence. Apps install `@nanostores/svelte` or `@nanostores/react` for framework binding — no custom adapter code

### Shared via Mitosis compilation

- **ui** — design system primitives (Button, Avatar, Badge, TextInput, MessageBubble, ChannelListItem). Written once as `.lite.tsx`, compiled to Svelte and React. See `docs/design-system.md`.

### NOT shared (written per-platform)

- Screen-level layouts and navigation
- Animations and gestures
- Platform-specific storage (Tauri filesystem API vs AsyncStorage)
- Push notification registration
- Navigation chrome

Expected shared code: **~70% by line count**.

---

## State Management Pattern

`packages/store` defines nanostores atoms per state slice. `bootstrap()` wires VexClient real-time events directly to atoms and populates initial state from HTTP. Svelte apps use atoms natively (nanostores implements the Svelte store contract); React Native apps use `@nanostores/react`.

```
VexClient (@vex-chat/libvex)
    └── event source for
nanostores atoms (@vex-chat/store)   ← $messages, $servers, $user, etc.
    │   wired in bootstrap() — events update atoms directly
    ├── apps/desktop (Svelte)        ← $messages native Svelte store — use $messages in templates
    └── @nanostores/react            ← apps/mobile: useStore($messages)
```

**State atoms** in `packages/store`:

| Atom | nanostores type | Updated when |
|---|---|---|
| `$user` | `atom<IUser \| null>` | login / whoami |
| `$familiars` | `map<Record<string, IUser>>` | bootstrap (when familiars API exists) |
| `$messages` | `map<Record<string, IMail[]>>` | bootstrap, incoming mail (DM) |
| `$groupMessages` | `map<Record<string, IMail[]>>` | bootstrap, incoming mail (group) |
| `$servers` | `map<Record<string, IServer>>` | bootstrap, serverChange event |
| `$channels` | `map<Record<string, IChannel[]>>` | bootstrap per server |
| `$permissions` | `map<Record<string, IPermission>>` | bootstrap per server |
| `$devices` | `map<Record<string, IDevice[]>>` | bootstrap (when familiars API exists) |
| `$onlineLists` | `map<Record<string, IUser[]>>` | server channel presence events |

**`packages/store`** — event wiring lives in `bootstrap()`:

```ts
// packages/store/src/bootstrap.ts
export async function bootstrap(serverUrl, deviceID, deviceKey) {
  const client = VexClient.create(serverUrl, deviceID, deviceKey)
  $client.set(client)

  client.on('authed', (user) => $user.set(user))
  client.on('mail', (mail) => {
    if (mail.group) {
      const prev = $groupMessages.get()[mail.group] ?? []
      $groupMessages.setKey(mail.group, [...prev, mail])
    } else {
      const me = $user.get()
      const key = me && mail.authorID === me.userID ? mail.readerID : mail.authorID
      const prev = $messages.get()[key] ?? []
      $messages.setKey(key, [...prev, mail])
    }
  })
  client.on('serverChange', (server) => $servers.setKey(server.serverID, server))

  await client.connect()
  // ... waterfall HTTP fetch populates $user, $servers, $channels
}
```

**`apps/desktop`** — nanostores atoms are native Svelte stores (implement `.subscribe()`):

```svelte
<script>
  // apps/desktop/src/lib/store/index.ts re-exports without $ prefix:
  // export { $messages as messages, $user as user } from '@vex-chat/store'
  import { messages, user } from '$lib/store'
</script>

{#each $messages[currentUserID] ?? [] as mail}
  <!-- $messages = Svelte auto-subscribed value of the `messages` atom -->
{/each}
```

**`apps/mobile`** — `@nanostores/react`:

```ts
import { useStore } from '@nanostores/react'
import { $messages } from '@vex-chat/store'

// In React Native component
const messages = useStore($messages)
// Re-renders only when atom changes — no Context, no Redux
```

> **Why nanostores?** 265–800 bytes. Zero dependencies. nanostores atoms implement the Svelte store contract (`.subscribe()`) so no adapter package is needed for Svelte — atoms work directly with the `$` reactive syntax. `@nanostores/react` provides `useStore()` backed by `useSyncExternalStore`. Used by Astro for cross-framework state. Eliminates the custom EventEmitter VexStore class and hand-rolled adapter boilerplate entirely.

> **No client-side pre-validation.** `VexClient` methods return typed discriminated union results (`{ ok: false, code: 'USERNAME_TAKEN' }`). The UI renders these directly. Duplicating server rules client-side creates drift — avoided by design.

---

## Relationship to Original vex-chat Repos

| Original repo | New equivalent | Notes |
|---|---|---|
| `types-js` | `packages/types` | Same role, modernized |
| `crypto-js` | `packages/crypto` | Same role |
| `libvex-js` | `packages/libvex` | Client SDK, framework-agnostic |
| `spire` | `apps/spire` | Clean reimplementation (Kysely, Zod, Vitest, ESM) |
| `vex-desktop` (Electron+React) | `apps/desktop` (Tauri+Svelte) | New shell + framework |
| — | `apps/mobile` (React Native) | New — mobile client |
| — | `packages/ui` (Mitosis) | New — shared design primitives |
| — | `packages/store` | New — framework-agnostic state |

---

See also: [packages.md](../reference/packages.md) for package APIs and dependency graph, [design-system.md](design-system.md) for the Mitosis component pipeline, [desktop-reimplementation.md](desktop-reimplementation.md) for the Electron → Tauri migration.
