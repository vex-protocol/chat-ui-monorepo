# Packages Layer

Canonical reference for `packages/*` — the shared TypeScript libraries that power all Vex clients.

---

## Overview

Five packages form the shared layer consumed by all Vex clients (desktop, mobile, third-party developers):

| Package | npm name | Purpose |
|---|---|---|
| `packages/types` | `@vex-chat/types` | Shared protocol interfaces — no runtime deps, no build step |
| `packages/crypto` | `@vex-chat/crypto` | NaCl signing, hex encoding, X3DH session crypto |
| `packages/libvex` | `@vex-chat/libvex` | Framework-agnostic client SDK (fetch + WebSocket) |
| `packages/store` | `@vex-chat/store` | nanostores atoms: state slices + bootstrap + VexClient event wiring |
| `packages/ui` | `@vex-chat/ui` | Mitosis design primitives compiled to Svelte + React |

All are `private: true` workspace packages consumed via `"workspace:*"` deps in `pnpm-workspace.yaml`.

---

## `packages/types` — `@vex-chat/types`

**No runtime dependencies. No build step. Source-first.**

TypeScript interfaces only — the wire format contract between server and clients. Consuming packages import directly from `./src/index.ts` via the `exports` field.

### Files

```
packages/types/src/
  index.ts      — barrel export
  user.ts       — IUser, IRegistrationPayload, ILoginBody
  device.ts     — IDevice, IDevicePayload, IKeyBundle, IPreKey, IOneTimeKey
  mail.ts       — IMail (wire format: nonce, cipher, header, mailType, …)
  server.ts     — IServer, IChannel, IPermission, IInvite
  token.ts      — TokenType, ALL_TOKEN_TYPES, IActionToken, ITokenStore
```

### Design rules

- **No Kysely-specific fields.** `deleted: number` stays in spire's `src/db/types.ts`, not here.
- **No classes, no enums at runtime.** Use `const` objects + `as const` for enum-like values so tree-shaking works.
- **No Zod schemas here.** Spire owns its own Zod schemas in `*.schemas.ts` files. These interfaces are the inferred shape.

### `package.json` shape

```json
{
  "name": "@vex-chat/types",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" }
}
```

---

## `packages/crypto` — `@vex-chat/crypto`

**Dependency on `tweetnacl` always. `ed2curve` + `futoin-hkdf` only for `session.ts`.**

Extracted from `apps/spire/src/auth/auth.crypto.ts` (hex encoding, NaCl signature verify) and extended with client-side primitives (signing, X3DH session setup).

### Files

```
packages/crypto/src/
  index.ts       — barrel export
  encoding.ts    — decodeHex, encodeHex
  nacl.ts        — verifyNaClSignature, verifyDetached
                   signMessage, signDetached, generateSignKeyPair
  session.ts     — ed2curve conversions, HKDF key derivation (X3DH)
```

### What lives where

| Function | File | Used by |
|---|---|---|
| `decodeHex` / `encodeHex` | `encoding.ts` | spire, libvex |
| `verifyNaClSignature` | `nacl.ts` | spire (auth routes) |
| `verifyDetached` | `nacl.ts` | spire (ws handshake) |
| `signMessage` / `signDetached` | `nacl.ts` | libvex |
| `generateSignKeyPair` | `nacl.ts` | libvex |
| `convertPublicKey` / `convertSecretKey` / `convertKeyPair` | `session.ts` | libvex only |
| `generateDHKeyPair` / `dh` | `session.ts` | libvex only |
| `deriveSessionKey` (HKDF-SHA256) | `session.ts` | libvex only |

**Stays in spire only:** `hashPassword` / `verifyPassword` (argon2id, server-only).

### Library rationale

| Old | New | Why |
|---|---|---|
| `tweetnacl` (CJS, 6yr old) | `@noble/curves/ed25519` | ESM-native, Cure53 audited Sept 2024, 9.7M weekly downloads |
| `ed2curve` (CJS UMD, broken named exports in ESM) | `ed25519.utils.toMontgomery` / `toMontgomerySecret` | Built into `@noble/curves` — no separate package |
| `futoin-hkdf` (CJS) | `@noble/hashes/hkdf` | ESM-native, zero deps, 29.9M weekly downloads |

### `package.json` shape

```json
{
  "name": "@vex-chat/crypto",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@noble/curves": "catalog:",
    "@noble/hashes": "catalog:"
  }
}
```

---

## `packages/libvex` — `@vex-chat/libvex`

**Framework-agnostic client SDK.** Uses native `fetch`, `eventemitter3` (typed events), `reconnecting-websocket`.

### DX Design Principles

#### 1. Typed events via EventEmitter3 generics

```ts
interface VexEvents {
  ready:        () => void
  authed:       (user: IUser) => void
  mail:         (mail: IMail) => void
  serverChange: (server: IServer) => void
  close:        () => void
  error:        (err: Error) => void
}

class VexClient extends EventEmitter<VexEvents> { ... }
// client.on('mail', (mail) => ...)  — mail is typed IMail, no cast needed
```

#### 2. Async iterator API — alongside EventEmitter

```ts
// Bot / TUI
for await (const mail of client.mail()) { ... }

// React Native
useEffect(() => {
  const iter = client.mail()
  ;(async () => { for await (const m of iter) setMessages(ms => [...ms, m]) })()
}, [])

// Svelte
const messages = readable([], set => {
  const iter = client.mail()
  ;(async () => { for await (const m of iter) set(prev => [...prev, m]) })()
})
```

#### 3. Discriminated union errors

```ts
type SendResult =
  | { ok: true;  mail: IMail }
  | { ok: false; code: 'PERMISSION_DENIED' | 'RATE_LIMITED' | 'NETWORK_ERROR'; message: string }

const result = await client.sendMail(payload)
if (!result.ok) switch (result.code) { ... }
```

#### 4. Sub-path export `/bot`

```ts
import { CommandRouter } from '@vex-chat/libvex/bot'
const router = new CommandRouter(client)
router.on('!ping', async (mail) => client.replyTo(mail, 'pong'))
```

#### 5. TSDoc on all public methods

For IntelliSense and generated API documentation.

### Files

```
packages/libvex/src/
  index.ts         — barrel: VexClient, VexEvents, error types, helpers
  client.ts        — VexClient class (extends EventEmitter<VexEvents>)
  connection.ts    — VexConnection: reconnecting-websocket + NaCl challenge handshake
  auth.ts          — register(), login(), logout(), whoami(), getToken()
  mail.ts          — sendMail(), fetchInbox(), mail() async iterator
  devices.ts       — listDevices(), fetchKeyBundle()
  servers.ts       — createServer(), listServers(), createChannel()
  http.ts          — typed fetch wrapper: get/post/delete
  iterators.ts     — fromEvent(): EventEmitter → AsyncIterable
  errors.ts        — VexError discriminated union, error factory
  bot/
    index.ts       — CommandRouter, replyTo() helper
    router.ts      — CommandRouter: routes mail to handlers by prefix
```

### VexClient public API

```ts
class VexClient extends EventEmitter<VexEvents> {
  // Lifecycle
  static create(serverUrl: string, deviceKey: Uint8Array): VexClient
  async connect(): Promise<void>       // emits "ready"
  async disconnect(): Promise<void>

  // Auth — discriminated union results
  async register(username: string, password: string): Promise<RegisterResult>
  async login(username: string, password: string): Promise<LoginResult>
  async logout(): Promise<void>
  async whoami(): Promise<IUser>
  async getToken(type: TokenType): Promise<IActionToken>

  // Mail
  async sendMail(payload: IMail): Promise<SendResult>
  async fetchInbox(deviceID: string): Promise<IMail[]>
  mail(): AsyncIterable<IMail>         // real-time stream

  // Devices
  async listDevices(userID: string): Promise<IDevice[]>
  async fetchKeyBundle(deviceID: string): Promise<IKeyBundle>

  // Servers
  async createServer(name: string): Promise<IServer>
  async listServers(): Promise<IServer[]>
  async createChannel(serverID: string, name: string): Promise<IChannel>

  // Key utils
  static generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array }
}
```

### `package.json` shape

```json
{
  "name": "@vex-chat/libvex",
  "private": true,
  "type": "module",
  "exports": {
    ".":     "./src/index.ts",
    "./bot": "./src/bot/index.ts"
  },
  "dependencies": {
    "@vex-chat/types":          "workspace:*",
    "@vex-chat/crypto":         "workspace:*",
    "eventemitter3":            "catalog:",
    "reconnecting-websocket":   "catalog:"
  }
}
```

---

---

## `packages/store` — `@vex-chat/store`

**Nanostores atoms per state slice.** Wraps `VexClient` from `@vex-chat/libvex` — wires real-time events via nanostores `onMount`, runs the bootstrap waterfall. Apps never import `VexClient` directly — they import atoms and install `@nanostores/svelte` or `@nanostores/react` for zero-boilerplate framework binding.

### Responsibility split

| Layer | Owns |
|---|---|
| `@vex-chat/libvex` (VexClient) | Network I/O: HTTP requests, WebSocket frames, NaCl handshake, discriminated union results |
| `@vex-chat/store` (nanostores atoms) | Runtime state: nanostores atoms per slice, `onMount` wires VexClient events, bootstrap waterfall |
| `@nanostores/svelte` | Framework binding for apps/desktop — `useStore($atom)` in `.svelte` files |
| `@nanostores/react` | Framework binding for apps/mobile — `useStore($atom)` in React Native components |

### Files

```
packages/store/src/
  index.ts         — barrel: all atoms + bootstrap()
  client.ts        — $client atom (singleton VexClient)
  bootstrap.ts     — bootstrap(serverUrl, deviceKey): init $client, run waterfall fetch
  user.ts          — $user atom + onMount wiring
  familiars.ts     — $familiars atom + onMount wiring
  messages.ts      — $messages, $groupMessages atoms + onMount wiring
  sessions.ts      — $sessions atom + onMount wiring
  servers.ts       — $servers atom + onMount wiring
  channels.ts      — $channels atom + onMount wiring
  permissions.ts   — $permissions atom + onMount wiring
  devices.ts       — $devices atom + onMount wiring
  onlineLists.ts   — $onlineLists atom + onMount wiring
```

### State atoms

All state is nanostores `atom()` or `map()` — plain values, no framework reactivity baked in. Apps subscribe via `@nanostores/svelte` or `@nanostores/react`.

| Atom | nanostores type | Keyed by |
|---|---|---|
| `$user` | `atom<IUser \| null>` | — |
| `$familiars` | `map<Record<string, IUser>>` | userID |
| `$messages` | `map<Record<string, IMessage[]>>` | recipientUserID |
| `$groupMessages` | `map<Record<string, IMessage[]>>` | channelID |
| `$sessions` | `map<Record<string, ISession[]>>` | userID |
| `$servers` | `map<Record<string, IServer>>` | serverID |
| `$channels` | `map<Record<string, IChannel[]>>` | serverID |
| `$permissions` | `map<Record<string, IPermission>>` | permID |
| `$devices` | `map<Record<string, IDevice[]>>` | userID |
| `$onlineLists` | `map<Record<string, IUser[]>>` | channelID |

### Wiring pattern

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

### Bootstrap sequence

`bootstrap(serverUrl, deviceKey)` in `bootstrap.ts` creates `$client`, connects, then runs a waterfall fetch on `VexClient` `'connected'`:

1. `whoami()` → set `$user`
2. `client.sessions.retrieve()` → populate `$sessions`
3. `client.users.familiars()` → populate `$familiars`
4. `POST /deviceList` (msgpack) → populate `$devices` for all familiars
5. `client.messages.retrieve(userID)` for each familiar → populate `$messages`
6. `client.servers.retrieve()` → populate `$servers`
7. `client.channels.retrieve(serverID)` for each server → populate `$channels`
8. `client.messages.retrieveGroup(channelID)` for each channel → populate `$groupMessages`
9. `client.permissions.retrieve()` → populate `$permissions`

Real-time event handlers wired via `onMount` per atom: `mail` → update `$messages`/`$groupMessages`; `session` → update `$sessions` + fetch devices; `permission` → refresh `$servers`/`$channels`; `disconnect` → handled by reconnecting-websocket.

Error recovery: HTTP 470 (corrupt key file) → rename keyfile to `-bak`, generate new secret key, save, set `$keyReplaced` atom for the app to navigate to login.

### `package.json` shape

```json
{
  "name": "@vex-chat/store",
  "private": true,
  "type": "module",
  "exports": { ".": "./src/index.ts" },
  "dependencies": {
    "@vex-chat/libvex": "workspace:*",
    "nanostores":       "catalog:"
  },
  "peerDependencies": {
    "@nanostores/svelte": ">=0.10",
    "@nanostores/react":  ">=0.8"
  },
  "peerDependenciesMeta": {
    "@nanostores/svelte": { "optional": true },
    "@nanostores/react":  { "optional": true }
  }
}
```

`@nanostores/svelte` and `@nanostores/react` are optional peer deps — each app installs only what it needs.

---

## `packages/ui` — `@vex-chat/ui`

**Mitosis design primitives.** Written once as `.lite.tsx` files, compiled to idiomatic Svelte components (`output/svelte/`) and React components (`output/react/`). Desktop imports from `output/svelte/`; mobile imports from `output/react/`. See `docs/design-system.md` for the full Figma ↔ Storybook pipeline.

### Files

```
packages/ui/
  mitosis.config.ts           — targets: svelte + react
  src/
    Button/
      Button.lite.tsx         — Button (size: sm/md/lg, variant: primary/secondary/ghost)
      Button.stories-shared.ts — shared story metadata (args, argTypes) — no framework imports
    Avatar/
      Avatar.lite.tsx         — Avatar (src + vexAvatarFromUUID fallback)
      Avatar.stories-shared.ts
    Badge/…  TextInput/…  SearchBar/…  MessageInput/…
    MessageBubble/…  ChannelListItem/…  ServerListItem/…  Modal/…  Loading/…
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
    main.ts                   — framework: @storybook/react-vite, stories: output/react/**
    preview.ts
  .storybook-svelte/          — Svelte Storybook config (port 6002)
    main.ts                   — framework: @storybook/svelte-vite, stories: output/svelte/**
    preview.ts
  .storybook/                 — Composition host (port 6000)
    main.ts                   — refs: { react: :6001, svelte: :6002 }, no local stories
    preview.ts
```

### Story authoring pattern

Mitosis compiles the same props to both React and Svelte — the component API is identical. Story metadata is written once in `*.stories-shared.ts` and thin per-framework wrappers (which `gen-story-wrappers.ts` can generate) add only the `component` import:

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

```tsx
// output/react/Button/Button.stories.tsx  — thin wrapper
import { Button } from './Button';
import { meta, Primary, Secondary } from '../../src/Button/Button.stories-shared';
export default { ...meta, component: Button };
export { Primary, Secondary };
```

```ts
// output/svelte/Button/Button.stories.ts  — identical shape
import Button from './Button.svelte';
import { meta, Primary, Secondary } from '../../src/Button/Button.stories-shared';
export default { ...meta, component: Button };
export { Primary, Secondary };
```

### Storybook architecture

A single Storybook process cannot render two frameworks simultaneously (Storybook 8 architecture constraint — requested since 2019, not shipped). The solution is **Storybook Composition**: three processes, one URL.

```
port 6001  @storybook/react-vite    stories: output/react/**/*.stories.tsx
port 6002  @storybook/svelte-vite   stories: output/svelte/**/*.stories.ts
port 6000  composition host (refs)  ← this is what developers open in the browser
```

The host at `:6000` shows a unified sidebar with React and Svelte sections. Clicking a story renders the appropriate framework in an iframe. Addons (Controls, Docs, Viewport) work within each child iframe.

Storybook Composition configs:

```ts
// .storybook-react/main.ts
export default {
  framework: '@storybook/react-vite',
  stories: ['../output/react/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-essentials'],
} satisfies StorybookConfig;

// .storybook-svelte/main.ts
export default {
  framework: '@storybook/svelte-vite',
  stories: ['../output/svelte/**/*.stories.ts'],
  addons: ['@storybook/addon-essentials'],
} satisfies StorybookConfig;

// .storybook/main.ts  (host — no local stories)
export default {
  framework: '@storybook/react-vite',
  stories: [],
  refs: {
    react:  { title: 'React',  url: 'http://localhost:6001' },
    svelte: { title: 'Svelte', url: 'http://localhost:6002' },
  },
} satisfies StorybookConfig;
```

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
  "scripts": {
    "build":              "mitosis build && tsx scripts/gen-story-wrappers.ts",
    "storybook:react":    "storybook dev --config-dir .storybook-react  --port 6001 --no-open",
    "storybook:svelte":   "storybook dev --config-dir .storybook-svelte --port 6002 --no-open",
    "storybook:host":     "storybook dev --config-dir .storybook        --port 6000",
    "storybook":          "concurrently -k \"pnpm storybook:react\" \"pnpm storybook:svelte\" \"wait-on http://localhost:6001 http://localhost:6002 && pnpm storybook:host\"",
    "build-storybook":    "pnpm build-storybook:react && pnpm build-storybook:svelte && storybook build --config-dir .storybook --output-dir storybook-static/host",
    "build-storybook:react":  "storybook build --config-dir .storybook-react  --output-dir storybook-static/react",
    "build-storybook:svelte": "storybook build --config-dir .storybook-svelte --output-dir storybook-static/svelte"
  },
  "exports": {
    "./svelte/*": "./output/svelte/*",
    "./react/*":  "./output/react/*"
  },
  "devDependencies": {
    "@builder.io/mitosis-cli":  "catalog:",
    "@builder.io/mitosis":      "catalog:",
    "@storybook/react-vite":    "^8.0.0",
    "@storybook/svelte-vite":   "^8.0.0",
    "@storybook/addon-essentials": "^8.0.0",
    "storybook":                "^8.0.0",
    "concurrently":             "catalog:",
    "wait-on":                  "^8.0.0",
    "react":                    "^18.0.0",
    "react-dom":                "^18.0.0",
    "svelte":                   "^5.0.0",
    "tsx":                      "catalog:"
  }
}
```

---

## TypeScript Resolution

- **Root tsconfig:** `"module": "nodenext"` — reads `package.json#exports`
- **Each package:** `"exports": { ".": "./src/index.ts" }` + `allowImportingTsExtensions: true`
- **pnpm `workspace:*`** creates symlinks → no extra `tsconfig.json` `paths` entries needed in consuming apps

---

## Dependency Graph

```
packages/types  ◄──────────────────────────────────────────────────┐
packages/crypto ◄────────────────────────────────────────┐         │
                                                          │         │
packages/libvex ─────── @vex-chat/types ◄────────────────┘         │
                └─────── @vex-chat/crypto                           │
                                                                    │
packages/store ──────── @vex-chat/libvex                            │
                                                                    │
packages/ui     ─────── (no runtime deps)                           │
                                                                    │
apps/spire ─────────────────────────────── @vex-chat/crypto         │
                                                                    │
apps/desktop ─┬── @vex-chat/store + @nanostores/svelte             │
              └── @vex-chat/ui (/svelte/*)                          │
                                                                    │
apps/mobile  ─┬── @vex-chat/store + @nanostores/react              │
              └── @vex-chat/ui (/react/*)              ◄────────────┘
```

- `packages/types` — zero runtime deps
- `packages/crypto` — `@noble/curves` + `@noble/hashes` only
- `packages/libvex` — types + crypto + `eventemitter3` + `reconnecting-websocket`
- `packages/store` — libvex + `nanostores`; apps install `@nanostores/svelte` or `@nanostores/react` as direct deps
- `packages/ui` — no runtime deps; Mitosis is a devDep only
- `apps/spire` — imports `@vex-chat/crypto` only (server has no state management needs)

---

## What Changes in `apps/spire`

Only 3 files change. Everything else (routes, services, Zod schemas, DB types, migrations, JWT, tests) is untouched.

| File | Change |
|---|---|
| `src/auth/auth.crypto.ts` | Import `decodeHex`, `encodeHex`, `verifyNaClSignature` from `@vex-chat/crypto`; delete those implementations |
| `src/ws/ws.service.ts` | Replace `nacl.sign.detached.verify(...)` with `verifyDetached(...)` from `@vex-chat/crypto` |
| `package.json` | Add `"@vex-chat/crypto": "workspace:*"` to dependencies |

`hashPassword` / `verifyPassword` stay in spire — they use `argon2id`, which is server-only.

---

## Verification Checklist

```bash
pnpm --filter @vex-chat/spire test    # 255 green
pnpm --filter @vex-chat/spire lint    # clean
pnpm -r exec tsc --noEmit            # zero errors across workspace
```
