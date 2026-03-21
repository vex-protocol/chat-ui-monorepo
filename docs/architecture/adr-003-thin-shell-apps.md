# ADR-003: Thin-Shell Apps — Maximizing Logic Reuse Across Desktop and Mobile

**Status:** Accepted (Phases 1–5 implemented 2026-03-20)
**Date:** 2026-03-20
**Deciders:** @dgill
**Supersedes:** None

---

## Context

Vex Chat ships two client apps — a Tauri+Svelte 5 desktop app and a React Native mobile
app — on top of five shared packages (`crypto`, `types`, `libvex`, `store`, `ui`). The
goal is for desktop and mobile to be **pure view layers** for their respective platforms,
with all reusable logic living in shared packages.

The current architecture is already well-structured: `libvex` provides the SDK,
`store` provides nanostores-based state, and `ui` provides Mitosis components.
However, a code audit reveals several categories of duplicated or misplaced logic
that prevent the apps from being truly thin shells.

---

## Industry Precedents

### The Spectrum of Shared Cores

```
Thin Core                                                    Thick Core
(crypto only)                                          (complete client)
    |                                                          |
    Signal           Discord           Element          Telegram
    libsignal       Shared JS         matrix-rust-sdk   TDLib
    |                Layer             |                  |
    Crypto +         Business          Protocol +         Everything
    Protocol         Logic +           Crypto +           except
    only             State             Sync +             UI pixels
                                       Timeline
```

**Signal** (`libsignal`): Shared Rust core handles only cryptography and protocol.
All app-level concerns (message storage, sync, UI state, job scheduling) live in each
platform app. Platform apps are thick.

**Element/Matrix** (`matrix-rust-sdk`): Most aggressive shared-core approach. The Rust
SDK handles the entire protocol layer — sync, timelines, room management, E2EE — via
UniFFI bindings. Mobile apps are genuinely thin SwiftUI/Compose shells.

**Telegram** (`TDLib`): The gold standard. TDLib is a complete Telegram client in C++
that handles everything except rendering pixels. Apps are pure UI shells driven by an
update/event stream from TDLib.

**Discord**: Shared JavaScript/TypeScript layer with custom Flux stores achieves 98%
code sharing between iOS and Android. Currently migrating core stores to Rust for
performance.

### Where Vex Sits Today — and Where It Should Go

Vex currently sits between Signal and Discord on this spectrum. `libvex` handles
networking, auth, messaging, and crypto (broader than Signal's libsignal), and `store`
handles reactive state (like Discord's Flux layer). But several business-logic concerns
have leaked into the app layers.

**Target:** Move toward the Element/TDLib end — apps should contain only:
- Platform-specific UI components (Svelte components / React Native screens)
- Navigation and routing
- Platform integrations (push notifications, keychain, file system, tray, updater)
- Platform-specific persistence implementations (IndexedDB, AsyncStorage)

---

## Audit: What's Currently Duplicated or Misplaced

### 1. Message Utilities (HIGH — duplicated business logic)

**Desktop** (`apps/desktop/src/lib/utils/messages.ts`):
- `chunkMessages()` — groups consecutive messages by author with 5-min gap threshold
- `parseFileExtra()` — parses file attachment metadata from mail.extra JSON
- `renderContent()` — emoji detection → markdown → sanitized HTML
- `formatTime()` — ISO timestamp → display string
- `handleLinkClick()` — external link interception

**Mobile** (`apps/mobile/src/components/MessageBubbleRN.tsx`):
- Inline timestamp formatting
- System message detection
- Author display logic

**Problem:** The message chunking algorithm, file attachment parsing, and time formatting
are pure business logic with zero platform dependency. They're identically needed on both
platforms but implemented separately.

### 2. Auth Flow Orchestration (HIGH — duplicated control flow)

**Desktop** (`apps/desktop/src/routes/Launch.svelte`):
```
loadActive() → decode keys → bootstrap(url, id, key, token, preKey, persistence)
  → fetch inbox → handle 470 key-replaced error
```

**Mobile** (`apps/mobile/App.tsx`):
```
loadFromKeychain() → decode keys → bootstrap(url, id, key, token, preKey, persistence)
  → handle key-replaced error
```

**Problem:** The auto-login orchestration logic — load stored credentials, decode hex
keys to Uint8Array, call bootstrap, handle error states — is identical on both platforms.
Only the credential loading (KeyStore) and persistence backends differ.

### 3. Deep Link / URL Parsing (MEDIUM — desktop-only, should be shared)

**Desktop** (`apps/desktop/src/lib/deeplink.ts`):
- Parses `vex://invite/{id}`, `vex://user/{id}`, `vex://server/{id}` URLs
- Navigates to appropriate routes

**Mobile:** No deep link handling yet.

**Problem:** The URL parsing logic is platform-agnostic. Only the navigation action is
platform-specific.

### 4. Server URL Configuration (LOW — trivial duplication)

Both apps have a `config.ts` with `getServerUrl()` / `setServerUrl()` reading from
platform storage. The shape is identical; only the storage backend differs.

### 5. Notification Decision Logic (MEDIUM — partially duplicated)

**Desktop** (`apps/desktop/src/lib/notifications.ts`):
- Decides when to show notifications (not for own messages, not for focused window)
- Deduplication logic

**Mobile** (`apps/mobile/src/lib/notifications.ts`):
- Similar decision logic adapted for mobile

**Problem:** The "should this message trigger a notification?" logic is business logic.
The "show a notification" action is platform-specific.

### 6. Unread Count / Badge (MEDIUM — desktop-only, should be shared)

**Desktop** (`apps/desktop/src/lib/tray.ts`):
- Tracks unread count per conversation
- Updates tray badge

**Problem:** Unread counts are business logic that belongs in the store. Both platforms
need them — desktop for tray badges, mobile for tab badges and app icon badges.

---

## Proposed Changes

### Phase 1: Extract Message Utilities into Store ✅

Created `packages/store/src/message-utils.ts`:

```typescript
import type { DecryptedMail } from '@vex-chat/types'

export interface MessageChunk {
  authorID: string
  authorName?: string
  timestamp: string
  messages: DecryptedMail[]
}

/**
 * Groups consecutive messages by the same author within a time gap.
 * Pure function — no platform dependencies.
 */
export function chunkMessages(
  messages: DecryptedMail[],
  gapMs = 5 * 60_000,
  maxPerChunk = 100,
): MessageChunk[] { /* ... */ }

/**
 * Parses file attachment metadata from mail.extra JSON.
 */
export function parseFileExtra(extra: string | null): FileAttachment | null { /* ... */ }

/**
 * Formats an ISO timestamp for display.
 * Returns relative time for today, date+time for older.
 */
export function formatMessageTime(isoTime: string): string { /* ... */ }

/**
 * Returns true if the message content is a single emoji (for large emoji rendering).
 */
export function isSingleEmoji(content: string): boolean { /* ... */ }
```

**Content rendering** stays platform-specific because:
- Desktop: markdown → HTML → DOMPurify sanitization (DOM required)
- Mobile: markdown → React Native rich text components

But the pure logic (emoji detection, URL extraction, mention parsing) moves to shared.

### Phase 2: Extract Auth Flow Orchestration into Store ✅

Created `packages/store/src/auto-login.ts`:

```typescript
import type { KeyStore } from '@vex-chat/types'
import type { PersistenceCallbacks } from './bootstrap.ts'
import { decodeHex } from '@vex-chat/crypto'
import { bootstrap, $keyReplaced } from './bootstrap.ts'

export interface AutoLoginResult {
  ok: boolean
  keyReplaced?: boolean
  error?: string
}

/**
 * Attempts auto-login from stored credentials.
 * Platform apps provide the KeyStore and PersistenceCallbacks implementations.
 */
export async function autoLogin(
  keyStore: KeyStore,
  serverUrl: string,
  persistence?: PersistenceCallbacks,
): Promise<AutoLoginResult> {
  const creds = await keyStore.loadActive()
  if (!creds) return { ok: false }

  try {
    const deviceKey = decodeHex(creds.deviceKey)
    const preKeySecret = decodeHex(creds.preKey)
    await bootstrap(serverUrl, creds.deviceID, deviceKey, creds.token, preKeySecret, persistence)
    return { ok: true }
  } catch (err: any) {
    if ($keyReplaced.get()) return { ok: false, keyReplaced: true }
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}
```

**Result:** Desktop's `Launch.svelte` and Mobile's `App.tsx` both reduce to:
```
const result = await autoLogin(keyStore, getServerUrl(), persistence)
if (result.ok) navigateToHome()
else if (result.keyReplaced) navigateToLogin()
```

### Phase 3: Extract Deep Link Parsing into libvex ✅

Created `packages/libvex/src/deeplink.ts`:

```typescript
export type VexLink =
  | { type: 'invite'; inviteID: string }
  | { type: 'user'; userID: string }
  | { type: 'server'; serverID: string }
  | { type: 'unknown'; raw: string }

/**
 * Parses a vex:// URL into a structured link.
 * Platform apps handle the navigation action.
 */
export function parseVexLink(url: string): VexLink { /* ... */ }
```

### Phase 4: Add Unread Counts to Store ✅

Implemented in `packages/store/src/unread.ts` with separate DM and channel tracking:

```typescript
import { map, computed } from 'nanostores'

/** Unread DM counts, keyed by userID. */
export const $dmUnreadCounts = map<Record<string, number>>({})

/** Unread channel counts, keyed by channelID. */
export const $channelUnreadCounts = map<Record<string, number>>({})

/** Total unread DMs. */
export const $totalDmUnread = computed($dmUnreadCounts, (counts) =>
  Object.values(counts).reduce((sum, n) => sum + n, 0)
)

/** Total unread channel messages. */
export const $totalChannelUnread = computed($channelUnreadCounts, (counts) =>
  Object.values(counts).reduce((sum, n) => sum + n, 0)
)

export function incrementDmUnread(userID: string): void { /* ... */ }
export function incrementChannelUnread(channelID: string): void { /* ... */ }
export function markRead(conversationKey: string): void { /* checks both maps */ }
export function resetAllUnread(): void { /* ... */ }
```

Wired into `bootstrap()` mail handler. Screens call `markRead()` on focus.

**Platform consumption:**
- Desktop: `$totalDmUnread` → home button badge, per-contact badges in FamiliarsList
- Mobile: `$totalDmUnread` → home button badge, per-contact badges in DMListScreen

### Phase 5: Extract Notification Decision Logic ✅

Implemented in `packages/store/src/notifications.ts`:

```typescript
import type { DecryptedMail } from '@vex-chat/types'
import { $user } from './user.ts'

export interface NotificationPayload {
  title: string
  body: string
  conversationKey: string
  mailID: string
  authorID: string
  /** Set for group messages — the channelID. */
  group: string | null
}

/**
 * Determines whether a received message should trigger a notification.
 * Returns a payload if yes, null if no.
 *
 * Platform apps handle the actual notification display:
 *   - Desktop: Tauri sendNotification + playNotify sound
 *   - Mobile: Notifee displayNotification
 *
 * @param resolveAuthorName  - Optional lookup from userID to display name
 * @param resolveChannelInfo - Optional lookup from channelID to channel+server names
 */
export function shouldNotify(
  mail: DecryptedMail,
  activeConversation: string | null,
  appFocused: boolean,
  resolveAuthorName?: (userID: string) => string | undefined,
  resolveChannelInfo?: (channelID: string) => { channelName: string; serverName: string } | undefined,
): NotificationPayload | null {
  // Suppresses: own messages, system messages, active conversation when focused
  // Group title format: "username (#channelName, serverName)"
  // DM title format: "username"
  // Body truncated to 100 chars
}
```

---

## Target Architecture

After all phases, the layer diagram looks like this:

```
+==================================================================+
||                    PLATFORM APPS (Thin Shells)                 ||
+==================================================================+
||  Desktop (Svelte 5 + Tauri)    |  Mobile (React Native)       ||
||  ─────────────────────────────  ─────────────────────────────  ||
||  Svelte components              React Native screens           ||
||  svelte-spa-router              React Navigation               ||
||  Tauri window/tray/updater      Notifee push notifications     ||
||  IndexedDB persistence impl     AsyncStorage persistence impl  ||
||  TauriKeyStore                  KeychainKeyStore               ||
||  DOMPurify HTML rendering       RN rich text rendering         ||
||  Web Audio sounds               (platform sounds)              ||
||  Tauri deep link listener       RN deep link listener          ||
+==================================================================+
         |  Svelte $ syntax              |  useStore() hook
         |  (no adapter needed)          |  (@nanostores/react)
         |                               |
+==============================================+
||          @vex-chat/store (nanostores)      ||
+==============================================+
||  $user | $messages | $groupMessages        ||
||  $servers | $channels | $permissions       ||
||  $devices | $familiars | $onlineLists      ||
||  $dmUnreadCounts | $channelUnreadCounts    ||
||  $totalDmUnread | $totalChannelUnread      ||
||  $verifiedKeys | $keyReplaced              ||
||  ──────────────────────────────────────    ||
||  bootstrap()     - SDK init + event wiring ||
||  autoLogin()     - credential → session    ||
||  resetAll()      - logout cleanup          ||
||  sendDirectMessage() - DM orchestration    ||
||  shouldNotify()  - notification decisions  ||
||  chunkMessages() - message grouping        ||
||  parseFileExtra() - attachment parsing     ||
||  formatTime()    - timestamp display       ||
||  incrementDmUnread() / markRead()          ||
+==============================================+
                     |
+==============================================+
||          @vex-chat/libvex (SDK)            ||
+==============================================+
||  VexClient        - main SDK facade        ||
||  VexConnection    - WebSocket + NaCl       ||
||  SessionManager   - X3DH encrypt/decrypt   ||
||  HttpClient       - REST + msgpack         ||
||  ──────────────────────────────────────    ||
||  auth module      - register/login/logout  ||
||  mail module      - send/receive/inbox     ||
||  servers module   - CRUD + channels        ||
||  users module     - lookup/search          ||
||  devices module   - manage devices         ||
||  parseVexLink()   - deep link parsing      ||
||  spire-wire       - legacy format adapter  ||
+==============================================+
                     |
         +-----------+-----------+
         |                       |
+==================+   +==================+
|| @vex-chat/crypto||   || @vex-chat/types ||
+==================+   +==================+
|| Ed25519 sign    ||   || IUser, IDevice  ||
|| X25519 DH       ||   || DecryptedMail   ||
|| XSalsa20 box    ||   || IServer, etc.   ||
|| HKDF session    ||   || KeyStore iface  ||
|| Fingerprints    ||   || StoredCreds     ||
+==================+   +==================+

+==================+
|| @vex-chat/ui    ||
+==================+
|| Mitosis → React ||
|| Mitosis → Svelte||
|| Avatar, Badge   ||
|| Button, Modal   ||
|| MessageChunk    ||
|| etc.            ||
+==================+
```

### What Stays in Apps (Platform-Specific)

| Concern | Desktop | Mobile | Why it can't be shared |
|---------|---------|--------|----------------------|
| UI Components | Svelte 5 components | React Native screens | Different rendering targets |
| Navigation | svelte-spa-router | React Navigation | Framework-specific |
| Key Storage | TauriKeyStore (plugin-store) | Keychain (react-native-keychain) | OS-specific secure storage |
| Message Persistence | IndexedDB | AsyncStorage | Platform storage APIs |
| Content Rendering | marked → DOMPurify (HTML) | RN Text components | DOM vs native views |
| Window Management | Tauri window/tray/menu | N/A | Desktop-only |
| App Updates | Tauri updater | App Store/Play Store | Platform-specific |
| Sounds | Web Audio API | (TBD) | Different audio APIs |
| Deep Link Listener | Tauri deep-link plugin | React Native Linking | Platform event source |

### What Moves to Shared Packages

| Logic | Current Location | Target Location | Type | Status |
|-------|-----------------|-----------------|------|--------|
| Message chunking | desktop/utils/messages.ts | store/message-utils.ts | Pure function | ✅ Done |
| File attachment parsing | desktop/utils/messages.ts | store/message-utils.ts | Pure function | ✅ Done |
| Timestamp formatting | desktop/utils/messages.ts | store/message-utils.ts | Pure function | ✅ Done |
| Emoji detection | desktop/utils/messages.ts | store/message-utils.ts | Pure function | ✅ Done |
| Auto-login orchestration | desktop/Launch.svelte, mobile/App.tsx | store/auto-login.ts | Async function | ✅ Done |
| Deep link URL parsing | desktop/deeplink.ts | libvex/deeplink.ts | Pure function | ✅ Done |
| Unread count tracking | desktop/tray.ts (partial) | store/unread.ts | Nanostore atoms | ✅ Done (split DM/channel) |
| Notification decisions | desktop/notifications.ts | store/notifications.ts | Pure function | ✅ Done (with author/channel resolution) |
| DM send orchestration | — (new) | store/send-dm.ts | Async function | ✅ Done |
| Server URL config shape | desktop/config.ts, mobile/config.ts | store/config.ts | Atom + helpers | Deferred |

---

## How Nanostores Bridges Svelte and React Native

The key architectural enabler is that nanostores atoms are **framework-agnostic ES module
singletons** that satisfy both Svelte's store contract and React's external store contract.

**Same store definition (in `packages/store`):**
```typescript
import { map } from 'nanostores'
export const $messages = map<Record<string, DecryptedMail[]>>({})
```

**Svelte consumption (desktop) — zero adapter, native `$` syntax:**
```svelte
<script>
  import { $messages as messages } from '@vex-chat/store'
</script>
{#each $messages[threadKey] ?? [] as mail}
  <MessageBubble {mail} />
{/each}
```

**React Native consumption (mobile) — via `@nanostores/react`:**
```tsx
import { useStore } from '@nanostores/react'
import { $messages } from '@vex-chat/store'

function ConversationScreen({ threadKey }) {
  const allMessages = useStore($messages)
  const messages = allMessages[threadKey] ?? []
  return <FlatList data={messages} renderItem={...} />
}
```

Both frameworks subscribe to the same store shape. Business logic functions like
`bootstrap()` mutate stores via `.set()` / `.setKey()` — framework-agnostic calls
that trigger re-renders in whichever framework is subscribed.

The `PersistenceCallbacks` dependency injection pattern already in `bootstrap()` is the
model for all platform-specific concerns: define an interface in the shared package,
inject implementations from the app layer.

---

## Implementation Priority

| Phase | Effort | Impact | Description | Status |
|-------|--------|--------|-------------|--------|
| 1 | Small | High | Extract message utilities (chunkMessages, parseFileExtra, formatTime) | ✅ Done |
| 2 | Small | High | Extract auto-login orchestration | ✅ Done |
| 3 | Tiny | Medium | Extract deep link parsing | ✅ Done |
| 4 | Small | Medium | Add unread counts to store (split DM/channel) | ✅ Done |
| 5 | Small | Medium | Extract notification decision logic (with author/channel resolution) | ✅ Done |

All five phases completed 2026-03-20. Remaining extraction opportunities identified in post-implementation audit:
- `sendGroupMessage()` — group send orchestration still inline in both apps
- `avatarHue()` — pure hash function duplicated 4×
- `parseInviteID()` — invite URL parsing duplicated 2×

---

## Design Principles Going Forward

1. **If it doesn't import a platform API, it doesn't belong in an app.** Pure TypeScript
   functions and nanostores atoms should always live in `packages/`.

2. **Platform-specific code is injected, not imported.** Follow the `PersistenceCallbacks`
   pattern: define interfaces in shared packages, implement in apps, inject at bootstrap.

3. **Apps are adapters, not owners.** An app adapts shared logic to its platform —
   mapping nanostores to Svelte reactivity, mapping notification payloads to Notifee
   calls, mapping KeyStore to OS keychain. It never owns the logic itself.

4. **Store is the orchestration layer.** `@vex-chat/store` is where SDK events become
   reactive state and where cross-cutting business logic (unread counts, notification
   decisions, message grouping) lives. It sits between the SDK and the apps.

5. **Test shared logic without mounting UI.** Every function in `store/` and `libvex/`
   should be testable with plain `vitest` — no Svelte, no React, no DOM.

---

## Rejected Alternatives

### Single-framework approach (all React / all React Native Web)

Would enable ~98% code sharing (like Discord) but sacrifices native desktop experience.
Tauri+Svelte produces smaller, faster desktop apps than Electron+React. The nanostores
bridge gives us cross-framework state sharing without sacrificing platform quality.

### Rust shared core (like Element/Signal)

Would provide maximum performance and true cross-platform sharing (including iOS native),
but the team currently ships TypeScript. A Rust rewrite of libvex would be a large
investment with FFI complexity. The current TypeScript SDK shared via nanostores achieves
the right balance for now. Rust can be introduced later for crypto-heavy hot paths if
needed.

### Shared React Native components on desktop (via react-native-web)

Possible but awkward — Tauri's Svelte UI is already built and working well. The Mitosis
approach in `@vex-chat/ui` handles the "write once" presentational component need without
forcing React onto desktop.

---

## References

- [Signal libsignal architecture](https://github.com/signalapp/libsignal)
- [Matrix Rust SDK crate hierarchy](https://github.com/matrix-org/matrix-rust-sdk)
- [Telegram TDLib documentation](https://core.telegram.org/tdlib)
- [Discord: Supercharging Mobile (React Native)](https://discord.com/blog/supercharging-discord-mobile-our-journey-to-a-faster-app)
- [Nanostores cross-framework design](https://github.com/nanostores/nanostores)
- [Astro shared state between framework islands](https://docs.astro.build/en/recipes/sharing-state-islands/)
- [ADR-001: Monorepo consolidation](./adr-001-monorepo-consolidation.md)
- [Platform strategy explanation](../explanation/platform-strategy.md)
