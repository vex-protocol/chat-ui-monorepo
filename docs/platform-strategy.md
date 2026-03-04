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
  libvex/         — client SDK, WebSocket, auth, message handling (framework-agnostic) (@vex-chat/libvex)
  crypto/         — NaCl encryption logic (@vex-chat/crypto)
  validation/     — input validation, message formatting
  store/          — framework-agnostic state containers (event emitter pattern)
  ui/             — Mitosis design primitives (.lite.tsx)
    output/svelte/ — generated Svelte components
    output/react/  — generated React/React Native components
    stories/       — Storybook stories for all primitives
apps/
  spire/          — server (Node.js, Express, Kysely)
  desktop/        — Tauri + Svelte, imports packages/libvex + packages/ui/output/svelte
  mobile/         — React Native, imports packages/libvex + packages/ui/output/react
```

Use **Turborepo** or **Nx** for monorepo orchestration (build ordering, caching, task pipelines).

---

## What Gets Shared

### 100% shared (framework-agnostic TypeScript)

- **types** — all interfaces, enums, API payload shapes
- **libvex** — client SDK (WebSocket, auth, message protocol) — the equivalent of the original `libvex-js`
- **crypto** — NaCl encryption, key management, session establishment
- **validation** — input validation, message formatting, mention detection
- **store** — state containers as plain TypeScript classes with event emitters

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

State lives in framework-agnostic TypeScript classes that emit events. Each platform writes a thin adapter (~10-15 lines) to subscribe.

```ts
// packages/store/src/chat-store.ts
import { EventEmitter } from 'eventemitter3';

export class ChatStore extends EventEmitter {
  private messages: Map<string, Message[]> = new Map();

  addMessage(channelId: string, message: Message) {
    const msgs = this.messages.get(channelId) ?? [];
    msgs.push(message);
    this.messages.set(channelId, msgs);
    this.emit('messages:changed', channelId);
  }

  getMessages(channelId: string): Message[] {
    return this.messages.get(channelId) ?? [];
  }
}
```

**Svelte adapter:**

```svelte
<script>
  import { chatStore } from '@vex-chat/store';
  import { readable } from 'svelte/store';

  export function useMessages(channelId) {
    return readable(chatStore.getMessages(channelId), (set) => {
      const handler = (id) => {
        if (id === channelId) set(chatStore.getMessages(id));
      };
      chatStore.on('messages:changed', handler);
      return () => chatStore.off('messages:changed', handler);
    });
  }
</script>
```

**React Native adapter:**

```ts
import { chatStore } from '@vex-chat/store';
import { useState, useEffect } from 'react';

export function useMessages(channelId: string) {
  const [messages, setMessages] = useState(chatStore.getMessages(channelId));
  useEffect(() => {
    const handler = (id: string) => {
      if (id === channelId) setMessages(chatStore.getMessages(id));
    };
    chatStore.on('messages:changed', handler);
    return () => { chatStore.off('messages:changed', handler); };
  }, [channelId]);
  return messages;
}
```

This pattern extends to routing (plain state machine in core, wired to svelte-routing / React Navigation), notification logic, media handling, and rich text parsing.

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
