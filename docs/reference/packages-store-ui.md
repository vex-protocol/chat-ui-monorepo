# `packages/store` and `packages/ui`

The state management layer and design system primitives that connect `Client` to app UIs.

---

## `packages/store` — `@vex-chat/store`

Nanostores atoms per state slice, exposed through the `VexService` facade (see [ADR-009](../architecture/adr-009-vexservice-facade.md)). `VexService` privately owns the `Client` from `@vex-chat/libvex` — apps never import `Client` directly. They call `vexService.login()`, `vexService.sendDM()`, etc. and subscribe to readonly atoms. Svelte apps use atoms natively (nanostores implements the Svelte store contract); React Native apps use `@nanostores/react`.

### Responsibility split

| Layer | Owns |
|---|---|
| `@vex-chat/libvex` (Client) | Network I/O: HTTP requests, WebSocket frames, NaCl handshake, discriminated union results |
| `@vex-chat/store` (VexService + atoms) | Runtime state: VexService facade, nanostores atoms per domain, event wiring, waterfall HTTP fetch |
| Svelte (native) | `$atomName` reactive syntax — no adapter needed; nanostores atoms implement `.subscribe()` |
| `@nanostores/react` | Framework binding for apps/mobile — `useStore($atom)` in React Native components |

### Files

```
packages/store/src/
  index.ts              — barrel: readonly atoms + vexService + utilities
  service.ts            — VexService class: auth, messaging, servers, user ops
  domains/
    identity.ts         — $user, $familiars, $devices, $avatarHash, $keyReplaced
    messaging.ts        — $messages, $groupMessages, $dmUnreadCounts, $channelUnreadCounts,
                          $totalDmUnread (computed), $totalChannelUnread (computed)
    servers.ts          — $servers, $channels, $permissions, $onlineLists
  deeplink.ts           — parseVexLink(), parseInviteID()
  message-utils.ts      — chunkMessages(), formatTime(), parseFileExtra(), avatarHue(), applyEmoji()
  notifications.ts      — shouldNotify() decision logic
```

Each domain module exports writable atoms (`$fooWritable`, internal to `service.ts`)
and readonly atoms (`$foo`, exported to apps via `readonlyType()`).
See [ADR-010](../architecture/adr-010-domain-atom-consolidation.md).

### State atoms

All state is nanostores `atom()` or `map()` — plain values, no framework reactivity baked in.

| Atom | Domain | nanostores type | Keyed by |
|---|---|---|---|
| `$user` | identity | `atom<IUser \| null>` | — |
| `$familiars` | identity | `map<Record<string, IUser>>` | userID |
| `$devices` | identity | `map<Record<string, IDevice[]>>` | ownerID (userID) |
| `$avatarHash` | identity | `atom<number>` | — (cache-busting counter) |
| `$keyReplaced` | identity | `atom<boolean>` | — |
| `$messages` | messaging | `map<Record<string, IMessage[]>>` | other party's userID |
| `$groupMessages` | messaging | `map<Record<string, IMessage[]>>` | channelID |
| `$dmUnreadCounts` | messaging | `map<Record<string, number>>` | userID |
| `$channelUnreadCounts` | messaging | `map<Record<string, number>>` | channelID |
| `$totalDmUnread` | messaging | `computed<number>` | — (sum of DM unreads) |
| `$totalChannelUnread` | messaging | `computed<number>` | — (sum of channel unreads) |
| `$servers` | servers | `map<Record<string, IServer>>` | serverID |
| `$channels` | servers | `map<Record<string, IChannel[]>>` | serverID |
| `$permissions` | servers | `map<Record<string, IPermission>>` | permissionID |
| `$onlineLists` | servers | `map<Record<string, IUser[]>>` | channelID |

All atoms are exported as `readonlyType()` wrappers — apps can subscribe but not write.

### VexService

`VexService` is the sole gateway between apps and the SDK. It privately owns the `Client` instance and exposes named methods for all operations. See [ADR-009](../architecture/adr-009-vexservice-facade.md).

Current exported service types from [packages/store/src/index.ts](../../packages/store/src/index.ts) include:
- `AuthProbeStatus`, `AuthResult`, `BackgroundNetworkFetchResult`
- `BootstrapConfig`, `CreateServerResult`, `DeviceApprovalRequest`
- `OperationResult`, `ResumeNetworkStatus`, `ServerOptions`, `SessionInfo`

**Auth methods** accept a `BootstrapConfig` (see [ADR-011](../architecture/adr-011-platform-config-ownership.md)) that provides platform-specific WebSocket, storage, and device name:

```ts
import { vexService } from '@vex-chat/store'
import { desktopConfig } from './platform'

const result = await vexService.autoLogin(keyStore, desktopConfig(), serverOptions)
if (!result.ok) navigateToLogin()
```

Internally, `VexService` creates the `Client`, wires events to writable atoms, connects, and runs the waterfall HTTP fetch. Events are wired **before** `connect()` so nothing is missed.

**Logout** resets all writable atoms to defaults and closes the Client connection.

### Svelte usage (`apps/desktop`)

nanostores atoms implement the Svelte store contract (`.subscribe()` method) — no adapter package needed.
`apps/desktop/src/lib/store/index.ts` re-exports atoms and `vexService` for convenient Svelte `$` syntax:

```ts
// apps/desktop/src/lib/store/index.ts
export { $messages as messages, $user as user, $servers as servers } from '@vex-chat/store'
export { vexService } from '@vex-chat/store'
```

```svelte
<script>
  import { messages, user, vexService } from '$lib/store'
</script>

{#each $messages[currentUserID] ?? [] as mail}
  <!-- $messages is the Svelte auto-subscribed value of the messages atom -->
{/each}
```

### `package.json` shape

```json
{
  "name": "@vex-chat/store",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@vex-chat/libvex": "1.2.0-rc.1",
    "nanostores":       "catalog:",
    "uuid":             "catalog:"
  },
  "peerDependencies": {
    "@nanostores/react": ">=0.8"
  },
  "peerDependenciesMeta": {
    "@nanostores/react": { "optional": true }
  }
}
```

`@vex-chat/libvex` is consumed as a published npm package (via verdaccio for local dev). `@nanostores/react` is an optional peer dep — only `apps/mobile` installs it. Svelte needs no adapter.

---

## `packages/ui` — `@vex-chat/ui`

Mitosis design primitives. Written once as `.lite.tsx` files, compiled to idiomatic Svelte components (`output/svelte/`) and React components (`output/react/`). Desktop imports from `output/svelte/`; mobile imports from `output/react/`. See [design-system.md](../explanation/design-system.md) for the full Figma-to-Storybook pipeline.

### Files

```
packages/ui/
  mitosis.config.ts           — targets: svelte + react
  src/
    Button/
      Button.lite.tsx         — Button (size: sm/md/lg, variant: primary/secondary/ghost/danger)
      Button.stories-shared.ts — shared story metadata (args, argTypes) — no framework imports
    Avatar/
      Avatar.lite.tsx         — Avatar (src + deterministic hue+initials fallback from userID)
      Avatar.stories-shared.ts
    Badge/
      Badge.lite.tsx          — count dot (red accent)
    ServerListItem/
      ServerListItem.lite.tsx — server icon + name with active/unread state
    StatusDot/
      StatusDot.lite.tsx      — 8px dot (online/away/offline/dnd)
    MemberListItem/
      MemberListItem.lite.tsx — StatusDot + Avatar + username; right panel rows
    MessageChunk/
      MessageChunk.lite.tsx   — avatar + author + timestamp + grouped messages; core chat primitive
    ChannelListItem/
      ChannelListItem.lite.tsx — #channel-name with active/unread state
    TextInput/…  SearchBar/…  Loading/…  Modal/…  MessageInput/…  MessageBubble/…
  output/                     — generated by `pnpm build`, committed to repo
    react/
      Button/
        Button.tsx            — compiled React component
        Button.stories.tsx    — thin CSF wrapper (6 lines) — imports Button.stories-shared
    svelte/
      Button/
        Button.svelte         — compiled Svelte component
        Button.stories.ts     — thin CSF wrapper (6 lines) — imports Button.stories-shared
  scripts/
    gen-story-wrappers.ts     — generates output/*/ComponentName.stories.{tsx,ts} from src/**/*-shared.ts
  .storybook-react/           — React Storybook config (port 6001)
  .storybook-svelte/          — Svelte Storybook config (port 6002)
  .storybook/                 — Composition host (port 6000)
```

### Story authoring pattern

Mitosis compiles the same props to both React and Svelte — the component API is identical. Story metadata is written once in `*.stories-shared.ts` and thin per-framework wrappers add only the `component` import:

```ts
// src/Button/Button.stories-shared.ts  — written once, no framework imports
export const meta = {
  title: 'Components/Button',
  argTypes: {
    variant: { control: 'select', options: ['primary', 'secondary', 'ghost'] },
    size:    { control: 'select', options: ['sm', 'md', 'lg'] },
  },
};
export const Primary   = { args: { variant: 'primary',   label: 'Click me' } };
export const Secondary = { args: { variant: 'secondary', label: 'Cancel'   } };
```

### Storybook architecture

Three processes, one URL (Storybook Composition):

```
port 6001  @storybook/react-vite    stories: output/react/**/*.stories.tsx
port 6002  @storybook/svelte-vite   stories: output/svelte/**/*.stories.ts
port 6000  composition host (refs)  ← this is what developers open in the browser
```

The host at `:6000` shows a unified sidebar with React and Svelte sections. Clicking a story renders the appropriate framework in an iframe.

### Build

```bash
pnpm --filter @vex-chat/ui build           # mitosis compile → output/svelte/ + output/react/ + gen-story-wrappers
pnpm --filter @vex-chat/ui storybook       # starts all 3 processes, opens :6000
pnpm --filter @vex-chat/ui storybook:react # port 6001 only
pnpm --filter @vex-chat/ui storybook:svelte # port 6002 only
```

Compiled output is committed to the repo so consuming apps don't need to run the Mitosis compiler themselves.

### `package.json` shape

```json
{
  "name": "@vex-chat/ui",
  "private": true,
  "type": "module",
  "exports": {
    "./svelte/*": "./output/svelte/*",
    "./react/*":  "./output/react/*"
  }
}
```

---

See also: [packages.md](packages.md) for the full dependency graph, [design-system.md](../explanation/design-system.md) for the Figma-to-code pipeline.
