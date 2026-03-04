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
  mobile/         — React Native (Expo); @vex-chat/store atoms + @nanostores/react + packages/ui/output/react
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

`packages/store` defines nanostores atoms per state slice. Each atom wires to `VexClient` events via nanostores' `onMount` hook. Apps install `@nanostores/svelte` or `@nanostores/react` — no custom adapter code needed.

```
VexClient (@vex-chat/libvex)
    └── event source for
nanostores atoms (@vex-chat/store)   ← $messages, $servers, $user, etc.
    │   wired via onMount() subscriptions to VexClient events
    ├── @nanostores/svelte           ← apps/desktop: useStore($messages)
    └── @nanostores/react            ← apps/mobile:  useStore($messages)
```

**State atoms** in `packages/store`:

| Atom | nanostores type | Updated when |
|---|---|---|
| `$user` | `atom<IUser \| null>` | login / whoami |
| `$familiars` | `map<Record<string, IUser>>` | connect, new session |
| `$messages` | `map<Record<string, IMessage[]>>` | bootstrap, incoming mail |
| `$groupMessages` | `map<Record<string, IMessage[]>>` | bootstrap, incoming mail |
| `$sessions` | `map<Record<string, ISession[]>>` | connect, new session event |
| `$servers` | `map<Record<string, IServer>>` | bootstrap, permission event |
| `$channels` | `map<Record<string, IChannel[]>>` | bootstrap, permission event |
| `$permissions` | `map<Record<string, IPermission>>` | bootstrap, permission event |
| `$devices` | `map<Record<string, IDevice[]>>` | bootstrap, session event |
| `$onlineLists` | `map<Record<string, IUser[]>>` | server channel presence |

**`packages/store`** — atom definition with VexClient event wiring:

```ts
// packages/store/src/messages.ts
import { map, onMount } from 'nanostores'
import { $client } from './client'

export const $messages = map<Record<string, IMessage[]>>({})

onMount($messages, () => {
  const client = $client.get()
  const off = client.on('mail', (mail) => {
    const thread = $messages.get()[mail.senderID] ?? []
    $messages.setKey(mail.senderID, [...thread, mail])
  })
  return off   // nanostores calls this when last subscriber detaches
})
```

**`apps/desktop`** — `@nanostores/svelte`:

```ts
import { useStore } from '@nanostores/svelte'
import { $messages } from '@vex-chat/store'

// In .svelte component
const messages = useStore($messages)
// $messages['senderID'] is reactive — Svelte auto-subscribes
```

**`apps/mobile`** — `@nanostores/react`:

```ts
import { useStore } from '@nanostores/react'
import { $messages } from '@vex-chat/store'

// In React Native component
const messages = useStore($messages)
// Re-renders only when atom changes — no Context, no Redux
```

> **Why nanostores?** 265–800 bytes. Zero dependencies. Official `@nanostores/svelte` and `@nanostores/react` adapters maintained by the nanostores team. `onMount` cleanly wires external event emitters (VexClient) with automatic cleanup on last-subscriber-detach. Used by Astro for cross-framework state. Eliminates the custom EventEmitter VexStore class and hand-rolled adapter boilerplate entirely.

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
