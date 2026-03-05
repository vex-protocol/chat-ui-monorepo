# Desktop App: Upstream vs. Reimplementation

Comparison of the original [`vex-desktop`](https://github.com/vex-chat/vex-desktop) (Electron 28 + React) against the new `apps/desktop` (Tauri 2 + Svelte) in this monorepo.

---

## Technology Stack

| Concern | Upstream (`vex-desktop`) | New (`apps/desktop`) |
|---|---|---|
| **Runtime** | Electron 28.2.0 | Tauri 2.10.3 |
| **UI library** | React 17 | Svelte 5 |
| **State management** | Redux Toolkit + Redux Saga | Svelte stores (runes) |
| **Bundler** | Webpack 5 (3 configs: main, preload, renderer) | Vite 7 (single config) |
| **Language** | TypeScript 4.1 | TypeScript (latest) |
| **Package manager** | Yarn | pnpm (workspace) |
| **CSS** | Bulma + SCSS | CSS / component styles |
| **Backend SDK** | `@vex-chat/libvex` v0.20.x (npm) | `@vex-chat/libvex` (workspace package) |
| **Crypto** | `@vex-chat/crypto` v0.7.x (npm) | `@vex-chat/crypto` (workspace package) |
| **Native backend** | Node.js (in-process) | Rust |

---

## Architecture Overview

### Upstream: Electron 3-Process Model

```
┌─────────────────────────────────────────────────────────────┐
│  Main Process (Node.js)  —  main.dev.ts                     │
│  • BrowserWindow creation                                    │
│  • IPC handler registration (35+ handlers)                  │
│  • electron-updater, system tray, vex:// protocol           │
├──────────────────────┬──────────────────────────────────────┤
│  Preload Script       │  Renderer Process (Chromium)         │
│  preload.ts           │  index.tsx → Base.tsx → routes       │
│  • contextBridge API  │  • React + React Router v5           │
│  • window.electron    │  • Redux store (14 slices)           │
│    - fs, path, dialog │  • Redux Saga side effects           │
│    - shell, clipboard │  • @vex-chat/libvex Client           │
│    - cookies, app     │  • 31 UI components                  │
│    - window control   │                                      │
└──────────────────────┴──────────────────────────────────────┘
```

### New: Tauri 2 Split Model

```
┌─────────────────────────────────────────────────────────────┐
│  Rust Core  —  src-tauri/src/lib.rs                         │
│  • tauri::Builder, plugin registration                      │
│  • capability-based access control                          │
│  • tauri commands (typed Rust functions → JS invoke)        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (OS WebView)  —  src/                             │
│  • Svelte 5 components                                      │
│  • Svelte runes / stores for state                          │
│  • @vex-chat/libvex workspace SDK                           │
│  • Vite dev server (port 5173)                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Electron 28 vs. Tauri 2: Key Differences

### Bundle Size & Memory

| Metric | Electron 28 | Tauri 2 |
|---|---|---|
| Installer size | 100–120 MB | 2.5–10 MB |
| Idle RAM | 200–300 MB | 30–40 MB |
| WebView engine | Bundled Chromium | OS native (WKWebView / WebView2 / WebKitGTK) |
| Node.js runtime | Bundled | None (Rust core) |

Electron ships a full Chromium engine. Tauri defers to the OS WebView, making installers roughly 10–20× smaller.

### Security Model

**Electron (contextIsolation + preload pattern):**
- Renderer runs in Chromium sandbox
- Node.js APIs gated through a manually-maintained preload whitelist
- `contextIsolation: false` in upstream vex-desktop — renderer had full Node access (security debt)
- Developer must discipline the IPC surface manually

**Tauri (capability-based, deny-by-default):**
- Nothing is accessible unless declared in `capabilities/*.json`
- Each plugin permission is opt-in (`opener:default`, `fs:read-files`, etc.)
- Rust type system enforces command signatures; no stringly-typed IPC channel names
- CSP enforced by default

### IPC Patterns

**Electron:**
```typescript
// Preload
contextBridge.exposeInMainWorld('electron', {
  fs: { readFile: (p, o) => ipcRenderer.invoke('fs:readFile', p, o) },
})

// Main
ipcMain.handle('fs:readFile', async (_, path, opts) => fs.readFile(path, opts))

// Renderer
const data = await window.electron.fs.readFile('/path/to/file', 'utf8')
```

**Tauri:**
```rust
// Rust
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    std::fs::read_to_string(path).map_err(|e| e.to_string())
}
```
```typescript
// Svelte
import { invoke } from '@tauri-apps/api/core'
const data = await invoke<string>('read_file', { path: '/path/to/file' })
```

### Platform Support

| Platform | Electron 28 | Tauri 2 |
|---|---|---|
| Windows | ✓ | ✓ |
| macOS | ✓ | ✓ |
| Linux | ✓ | ✓ |
| iOS | ✗ | ✓ (v2.0+) |
| Android | ✗ | ✓ (v2.0+) |

Tauri 2's mobile support means a potential `apps/mobile` that shares the same Svelte frontend and `@vex-chat/libvex` SDK without a separate React Native codebase.

### Performance

| Metric | Electron 28 | Tauri 2 |
|---|---|---|
| Cold startup | 1–2 s | < 500 ms |
| Hot reload (dev) | Webpack HMR (~1–3 s) | Vite HMR (< 100 ms) |
| CPU idle | Higher (full browser) | Lower (native WebView) |

### Build Tooling

| Aspect | Electron 28 | Tauri 2 |
|---|---|---|
| Bundler | Webpack (3 configs) | Vite (1 config) |
| Packager | electron-builder (separate) | Built-in `tauri build` |
| Dev workflow | `yarn start` + `yarn start:main` (two terminals) | `tauri dev` (single command, manages Vite internally) |
| Config files | `.erb/configs/webpack.*.js` (3 files), electron-builder config | `tauri.conf.json` + `vite.config.ts` |

---

## Feature-by-Feature Status

### Auth & User Management

| Feature | Upstream | New | Notes |
|---|---|---|---|
| Register | ✓ React view | — | `@vex-chat/libvex` `register()` available |
| Login | ✓ React view | — | `@vex-chat/libvex` `login()` available |
| Logout | ✓ | — | |
| Key file load/save | ✓ via `window.electron.fs` | — | Will use Tauri `fs` plugin |
| Key guardian singleton | ✓ `KeyGaurdian.ts` | — | Svelte store equivalent needed |
| Session cookies (JWT) | ✓ via `window.electron.cookies` | — | Tauri `http` plugin or JS `fetch` |

### Messaging

| Feature | Upstream | New | Notes |
|---|---|---|---|
| Direct messages | ✓ Redux slice + `MessagingPane` | — | |
| Group/channel messages | ✓ Redux slice + `ServerPane` | — | |
| Real-time (WS) | ✓ via libvex Client | — | `@vex-chat/libvex` async iterator |
| Markdown rendering | ✓ react-markdown | — | Svelte equivalent needed |
| Emoji picker | ✓ emoji-mart | — | |
| Syntax highlighting | ✓ highlight.js | — | |
| Message notifications | ✓ desktop notifications + sound | — | Tauri notification plugin |

### Servers & Channels

| Feature | Upstream | New | Notes |
|---|---|---|---|
| Create/join servers | ✓ | — | |
| Channel management | ✓ | — | |
| Permissions | ✓ | — | |
| Online user list | ✓ Redux slice | — | |

### UI / Shell

| Feature | Upstream | New | Notes |
|---|---|---|---|
| Custom title bar | ✓ frameless window | — | Tauri window decorations config |
| System tray | ✓ (non-macOS) | — | Tauri tray-icon plugin |
| vex:// deep links | ✓ protocol handler | — | Tauri deep-link plugin |
| Auto-update | ✓ electron-updater | — | Tauri updater plugin |
| Settings persistence | ✓ electron-store | — | Tauri store plugin |
| External links | ✓ `shell.openExternal` | ✓ `tauri-plugin-opener` | Done |
| Theme (dark/light) | ✓ configurable | — | |

### State Management

**Upstream:** 14 Redux slices composed in `rootReducer.ts`:
- `user`, `familiars`, `messages`, `sessions`, `app`, `servers`, `channels`, `groupMessages`, `permissions`, `devices`, `onlineLists`, `historyStacks`, `avatarHash`, `files`
- Redux Saga for side effects (notification, device fetch on new session, permission refresh)

**New:** `packages/store` (`@vex-chat/store`) + Svelte adapter.
- `VexStore` maintains all shared state as plain Maps — framework-agnostic, shared with mobile
- Svelte adapter (`packages/store/adapters/svelte`) wraps each slice as a `readable()` store
- Components import from the adapter: `import { useMessages } from '$lib/store/svelte'`
- Local ephemeral UI state (modal open, input value) uses Svelte `$state` runes — never in VexStore
- No saga middleware — `VexStore` wires all real-time handlers internally; components just subscribe

---

## Data Flow Comparison

### Upstream: Incoming Message

```
WS → libvex Client → "message" event → Redux dispatch → selector → React re-render
                   → Redux Saga → notification side effect
```

### New: Incoming Message

```
WS → VexClient ("mail" event)
   → VexStore.on("mail") → update messages/groupMessages Map → emit "messages:changed"
   → Svelte adapter readable() → Svelte component reactive update (no virtual DOM)
   → Tauri notification plugin (side effect, also in VexStore)
```

---

## Key File Mapping

| Upstream file | Purpose | New equivalent |
|---|---|---|
| `src/main.dev.ts` | Electron main process | `src-tauri/src/lib.rs` |
| `src/preload.ts` | Context bridge API | Tauri capabilities + plugins |
| `src/ipc-handlers.ts` | 35 IPC handlers | Tauri Rust commands |
| `src/index.tsx` | React + Redux bootstrap | `src/main.ts` (Svelte mount) |
| `src/Base.tsx` | Root router | `src/App.svelte` + svelte-routing |
| `src/rootReducer.ts` | 14 Redux slices | `packages/store` VexStore Maps |
| `src/store.ts` | Redux store + saga middleware | `@vex-chat/store` VexStore |
| `src/views/ClientLauncher.tsx` | SDK init + bootstrap waterfall | `packages/store/src/bootstrap.ts` |
| `src/views/Login.tsx` | Auth UI | `src/routes/login/Login.svelte` |
| `src/utils/KeyGaurdian.ts` | In-memory key store | Svelte writable store + Tauri plugin-fs |
| `src/utils/DataStore.ts` | Settings persistence | Tauri plugin-store |
| `src/utils/createClient.ts` | SDK factory | `VexStore.create()` in `@vex-chat/store` |

---

## What the Upstream Got Right

- **Full feature parity** with the Spire backend — auth, DM, servers, channels, permissions, devices, notifications
- **Clean Redux slice separation** — each domain has its own slice and clear action creators
- **libvex abstraction** — UI code never touches raw WebSocket frames or NaCl bytes
- **Notification UX** — desktop notifications + sound + mention detection
- **vex:// protocol** — deep-linkable invites and conversations
- **Auto-update** — production-ready, signed binary distribution

---

## What the Reimplementation Improves

- **Bundle size**: ~10× smaller installer (no bundled Chromium)
- **Memory**: ~5–8× less idle RAM
- **Mobile**: iOS + Android from same codebase via Tauri 2 mobile targets
- **Security**: capability-based deny-by-default vs. manually-guarded IPC whitelist; `contextIsolation: false` security debt eliminated
- **Dev speed**: Vite HMR vs. Webpack HMR; single `tauri dev` vs. two-terminal workflow
- **Reactivity**: Svelte 5 runes compile to direct DOM mutations; no virtual DOM overhead
- **Monorepo coherence**: `@vex-chat/libvex`, `@vex-chat/crypto`, `@vex-chat/types` consumed as workspace packages — no version drift
- **Type safety**: Rust command signatures are compiler-verified; no stringly-typed IPC channel names

---

## Migration Risks & Notes

1. **OS WebView consistency** — Tauri uses the OS WebView (WKWebView on macOS, WebView2 on Windows, WebKitGTK on Linux). CSS/JS behavior may differ slightly across platforms; upstream's Chromium was identical everywhere.

2. **Rust learning curve** — any new native capability requires writing a Tauri plugin or Rust command. Upstream's Node.js IPC was pure JS.

3. **No electron-store equivalent out of box** — Tauri's `plugin-store` is the equivalent; it persists JSON via Rust. The API is similar but async.

4. **No direct `fs` access in JS** — Tauri scopes all file access via `plugin-fs` with declared `scope` paths. Upstream had unrestricted Node.js `fs` in main + IPC bridge.

5. **vex:// deep links** — requires `tauri-plugin-deep-link` with platform-specific registration (Info.plist on macOS, registry on Windows).

6. **Key file storage** — `~/.vex-desktop/keys/{username}` in upstream. New app should use `$APPDATA/vex-chat/keys/` via `app.path('appData')` Tauri command, or Tauri's secure storage plugin.

---

## Current Status

### `apps/desktop`

| Area | Status |
|---|---|
| Vite + Svelte scaffold | ✓ Done |
| Tauri 2 init + Rust build | ✓ Done |
| External links (`tauri-plugin-opener`) | ✓ Done |
| App shell (routing, TitleBar, layout) | ✓ Done (ServerBar, ChannelBar, FamiliarsList, UserMenu) |
| Auth UI (login / register) | ✓ Done |
| Message rendering (MessageBox, ChatInput) | ✓ Done (chunkMessages, markdown, Avatar) |
| Direct messaging | ✓ Done (Messaging route, DM send via listDevices) |
| Servers / channels | ✓ Done (ServerChannel route, create server/channel) |
| Server management (create, invite, settings) | Partial — create server + channel done; invite system half-built in spire (create/list endpoints exist, no join/redeem endpoint); no UI |
| User search & familiars | ✓ Done (FamiliarsList with search + localStorage persistence) |
| Avatar system | ✓ Done (shared Mitosis Avatar component) |
| Sound effects | ✓ Done (auth + notification audio) |
| Notifications | ✓ Done (Tauri notifications + tray badge) |
| Settings / key storage | Partial — key storage done; settings screen exists |
| File / image attachments | — Not started |
| Session fingerprint verification | — Not started |
| System tray | ✓ Done (macOS tray, restore from minimized) |
| Deep links (vex://) | — Not started |
| Auto-update | — Not started |
| **Desktop UI polish** | Done (server bar pill indicators, header action icons, members sidebar, user status bar, chat input redesign) |

### `packages/store`

| Area | Status |
|---|---|
| nanostores atoms (user, messages, servers, channels, etc.) | ✓ Done |
| Bootstrap sequence | ✓ Done |
| Real-time event wiring (mail, serverChange) | ✓ Done |
| Svelte adapter (nanostores native) | ✓ Done |
| React adapter (@nanostores/react) | ✓ Done |

### `packages/ui`

| Area | Status |
|---|---|
| Mitosis setup + compile pipeline | ✓ Done |
| Avatar | ✓ Done (deterministic hue fallback, image support) |
| MessageChunk | ✓ Done (composes Avatar) |
| StatusDot | ✓ Done |
| MemberListItem | ✓ Done (composes Avatar + StatusDot) |
| Remaining primitives (Button, TextInput, Badge, etc.) | — Not started |
| Storybook stories | — Not started |

### `apps/mobile`

| Area | Status |
|---|---|
| React Native scaffold + navigation | ✓ Done (bare RN, bottom tabs, stack navigators) |
| Auth screens (login, register, keychain) | ✓ Done |
| Servers & channels screens | ✓ Done (ServerList, ChannelList, Channel) |
| Direct messaging | Done (DMListScreen with search + familiars, ConversationScreen with send) |
| Push notifications | — Not started |
| Settings | Done (account info, danger zone with sign out + clear keys) |
