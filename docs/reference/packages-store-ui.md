# `packages/store` and `packages/ui`

The state management layer and design system primitives that connect `Client` to app UIs.

---

## `packages/store` — `@vex-chat/store`

Nanostores atoms per state slice. Wraps `Client` from `@vex-chat/libvex` — `bootstrap()` wires real-time events directly to atoms and runs the waterfall HTTP fetch. Apps never import `Client` directly — they import atoms. Svelte apps use atoms natively (nanostores implements the Svelte store contract); React Native apps use `@nanostores/react`.

### Responsibility split

| Layer | Owns |
|---|---|
| `@vex-chat/libvex` (Client) | Network I/O: HTTP requests, WebSocket frames, NaCl handshake, discriminated union results |
| `@vex-chat/store` (nanostores atoms) | Runtime state: nanostores atoms per slice, event wiring in `bootstrap()`, waterfall HTTP fetch |
| Svelte (native) | `$atomName` reactive syntax — no adapter needed; nanostores atoms implement `.subscribe()` |
| `@nanostores/react` | Framework binding for apps/mobile — `useStore($atom)` in React Native components |

### Files

```
packages/store/src/
  index.ts         — barrel: all atoms + bootstrap() + resetAll() + $keyReplaced
  client.ts        — $client atom<Client | null>
  bootstrap.ts     — bootstrap(serverUrl, deviceID, deviceKey): create client, wire events, connect, waterfall fetch
  reset.ts         — resetAll(): resets all atoms to defaults on logout
  user.ts          — $user atom<IUser | null>
  familiars.ts     — $familiars map (populated when familiars API exists)
  messages.ts      — $messages, $groupMessages maps (DM keyed by userID, group by channelID)
  servers.ts       — $servers map (populated by bootstrap + serverChange event)
  channels.ts      — $channels map (populated by bootstrap per server)
  permissions.ts   — $permissions map
  devices.ts       — $devices map
  onlineLists.ts   — $onlineLists map
  avatarHash.ts    — $avatarHash atom<number> (cache-busting counter for avatar uploads)
  verifiedKeys.ts  — $verifiedKeys atom<Set<string>> (localStorage-persisted) + markVerified/unmarkVerified/isVerified
  auto-login.ts    — auto-login logic from stored credentials
  deeplink.ts      — deep link handling
  key-replaced.ts  — $keyReplaced atom + detection logic
  message-utils.ts — message helper utilities
  notifications.ts — notification wiring
  send-dm.ts       — send DM action
  send-group-message.ts — send group message action
  unread.ts        — unread count tracking
```

### State atoms

All state is nanostores `atom()` or `map()` — plain values, no framework reactivity baked in.

| Atom | nanostores type | Keyed by |
|---|---|---|
| `$user` | `atom<IUser \| null>` | — |
| `$familiars` | `map<Record<string, IUser>>` | userID |
| `$messages` | `map<Record<string, IMessage[]>>` | other party's userID |
| `$groupMessages` | `map<Record<string, IMessage[]>>` | channelID |
| `$servers` | `map<Record<string, IServer>>` | serverID |
| `$channels` | `map<Record<string, IChannel[]>>` | serverID |
| `$permissions` | `map<Record<string, IPermission>>` | permissionID |
| `$devices` | `map<Record<string, IDevice[]>>` | ownerID (userID) |
| `$onlineLists` | `map<Record<string, IUser[]>>` | channelID |
| `$avatarHash` | `atom<number>` | — (cache-busting counter) |
| `$verifiedKeys` | `atom<Set<string>>` | — (localStorage-persisted signKeys) |

### Wiring pattern

Events are wired in `bootstrap()` after creating the client, before `client.connect()`:

```ts
// packages/store/src/bootstrap.ts (excerpt)
import { map } from 'nanostores'
import { $client } from './client'

client.on('message', (msg) => {
  if (msg.group) {
    const prev = $groupMessages.get()[msg.group] ?? []
    $groupMessages.setKey(msg.group, [...prev, msg])
  } else {
    const me = $user.get()
    const key = me && msg.authorID === me.userID ? msg.readerID : msg.authorID
    const prev = $messages.get()[key] ?? []
    $messages.setKey(key, [...prev, msg])
  }
})
client.on('serverChange', (server) => $servers.setKey(server.serverID, server))
```

### Bootstrap sequence

`bootstrap(serverUrl, deviceID, deviceKey)` in `bootstrap.ts` creates the `Client`, wires events, connects, then fetches initial state. Events are wired **before** `connect()` so nothing is missed.

**Currently implemented** (matched to spire's existing endpoints):
1. `client.users.me()` → set `$user`
2. `client.servers.list()` → populate `$servers`
3. `client.channels.list(serverID)` for each server → populate `$channels` (parallel)

**Pending server endpoints:**
- `$familiars` — needs `GET /users/me/familiars` (currently populated on first DM)
- `$devices` — needs familiars list first, then `GET /user/:id/devices` per familiar
- `$messages` (DM history) — needs `GET /messages/:userID`
- `$groupMessages` (channel history) — needs `GET /channel/:id/messages`
- `$permissions` — needs `GET /users/me/permissions` or per-server endpoint

Error recovery: HTTP 470 (corrupt key file) → set `$keyReplaced = true` for the app to navigate to login.

### Logout / state reset

`resetAll()` in `reset.ts` sets every atom back to its default value. Call it on logout before clearing localStorage credentials to prevent stale data from leaking to the next user session. `$verifiedKeys` is intentionally NOT reset — verified fingerprints are device-scoped and persist across accounts.

### Svelte usage (`apps/desktop`)

nanostores atoms implement the Svelte store contract (`.subscribe()` method) — no adapter package needed.
`apps/desktop/src/lib/store/index.ts` re-exports atoms without the `$` prefix so Svelte's `$` reactive syntax works cleanly:

```ts
// apps/desktop/src/lib/store/index.ts
export { $messages as messages, $user as user, $servers as servers } from '@vex-chat/store'
```

```svelte
<script>
  import { messages, user } from '$lib/store'
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
    "@vex-chat/types":  "workspace:*",
    "@vex-chat/libvex": "workspace:*",
    "nanostores":       "catalog:"
  },
  "peerDependencies": {
    "@nanostores/react": ">=0.8"
  },
  "peerDependenciesMeta": {
    "@nanostores/react": { "optional": true }
  }
}
```

`@vex-chat/types` and `@vex-chat/libvex` resolve to the sibling repos (`../types-js`, `../libvex-js`) linked via pnpm workspace. `@nanostores/react` is an optional peer dep — only `apps/mobile` installs it. Svelte needs no adapter.

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
