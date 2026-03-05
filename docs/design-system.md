# Design System

The Vex design system bridges Figma and code. Designers own the visual truth in Figma; developers implement primitives in code and publish to Storybook. The two stay linked bidirectionally.

---

## Visual Direction

**Dark, dense, and red-accented.** Information-rich without being cluttered. Inspired by a hacker-aesthetic Discord — near-black panels, desaturated text, and a single crimson accent that owns all interactive states.

### Color palette (reference values — finalize in Figma)

| Token | Dark | Light | Role |
|---|---|---|---|
| `--accent` | `#cc2a2a` | `#b01c1c` | Buttons, active states, focus rings, self-message author name |
| `--bg-primary` | `#1a1a1a` | `#f0f0f0` | Main content area |
| `--bg-secondary` | `#141414` | `#e6e6e6` | Sidebar / panel backgrounds |
| `--bg-tertiary` | `#0f0f0f` | `#dadada` | Server bar background (deepest layer) |
| `--bg-surface` | `#242424` | `#d0d0d0` | Cards, input backgrounds |
| `--bg-hover` | `#2e2e2e` | `#c4c4c4` | Hover highlight |
| `--text-primary` | `#e8e8e8` | `#1a1a1a` | Body text |
| `--text-secondary` | `#a0a0a0` | `#4a4a4a` | Timestamps, metadata |
| `--text-muted` | `#666666` | `#888888` | Placeholders, empty states |
| `--danger` | `#e53935` | `#c62828` | Destructive actions |
| `--success` | `#43a047` | `#2e7d32` | Confirmations |
| `--warning` | `#fb8c00` | `#e65100` | Alerts |
| `--border` | `#2a2a2a` | `#d0d0d0` | Dividers |

> ~~The current app uses Catppuccin Mocha (purple accent).~~ **Done.** Both dark and light themes now use the crimson palette in `app.css`.

### Layout

```
┌──────────┬────────────────┬────────────────────────────────┬──────────────┐
│ Server   │  Channel list  │  Message area                  │  Members /   │
│ bar      │  (220px)       │  (flex: 1)                     │  Familiars   │
│ (64px)   │                │                                │  (220px)     │
│          │  #general      │  [Avatar] Username  12:34pm    │              │
│  [●]     │  #random       │    Message content here        │  ● user1     │
│  [●]     │  #off-topic    │    Another line                │  ● user2     │
│  [+]     │                │                                │  ○ user3     │
│          │                │  [Avatar] username2  12:36pm   │              │
│          │                │    Their message               │              │
└──────────┴────────────────┴────────────────────────────────┴──────────────┘
│  [Avatar] You              [text input ──────────────────────]            │
└───────────────────────────────────────────────────────────────────────────┘
```

Key layout observations from the design:
- **Server bar** shows circular avatar thumbnails (uploaded images), not letter initials
- **Message chunks** group consecutive messages from the same author; only the first line shows avatar + name
- **Member panel** (right) shows compact rows: 8px status dot + avatar + username
- **All interactive states** use the crimson accent — active server, focus ring, self-author name, hover backgrounds

### Typography

- **Font**: System UI stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`)
- **Body**: 14px / 1.5 line-height
- **Timestamps / metadata**: 11–12px, `--text-muted`
- **Channel headers / section labels**: 11px, uppercase, `letter-spacing: 0.05em`, `--text-muted`
- **Monospace (code blocks)**: `'SF Mono', 'Fira Code', monospace`, 13px

---

## Architecture

```
Figma (design source of truth)
    ↓  designer hands off via Dev Mode
Developers implement in packages/ui/
    ↓  Mitosis compiles .lite.tsx → Svelte + React
Storybook (published, browsable by everyone)
    ↓  Storybook Connect embeds stories back in Figma
Figma (designer sees live implementation)
```

---

## Mitosis: Write Once, Compile to Both

[Mitosis](https://github.com/BuilderIO/mitosis) (by Builder.io) compiles a restricted JSX dialect to multiple frameworks.

```tsx
// packages/ui/src/message-bubble.lite.tsx
import { useStore } from "@builder.io/mitosis";

export default function MessageBubble(props) {
  const state = useStore({
    expanded: false,
  });

  return (
    <div css={{ padding: "8px", borderRadius: "12px" }}>
      <span>{props.author}</span>
      <p>{props.content}</p>
      <button onClick={() => (state.expanded = !state.expanded)}>
        {state.expanded ? "Less" : "More"}
      </button>
    </div>
  );
}
```

Building generates `output/svelte/` and `output/react/` directories with idiomatic components.

### What Mitosis handles well

Stateless or lightly stateful **presentational components** — pure display, no scroll refs, no complex lifecycle. These are written once and compiled to both Svelte and React Native.

#### Tier 1 — High-value, clearly shared

| Component | Props surface | Notes |
|---|---|---|
| `Avatar` | `src`, `userID`, `size`, `name` | Circular image + deterministic hue+initials fallback. Already in desktop — needs to be the shared primitive. |
| `Badge` | `count`, `max?` | Red dot with number. Overlaid on ServerIcon for unread count. |
| `ServerIcon` | `src?`, `name`, `active`, `size` | Avatar variant for servers: image or letter initial; active = colored ring (not squircle pill — that's Svelte-specific). |
| `MessageChunk` | `authorID`, `authorName`, `avatarSrc?`, `time`, `messages[]` | Avatar + bold name + timestamp + grouped message lines. Core chat primitive. |
| `ChannelListItem` | `name`, `active`, `unread?` | `#name` with active state. |
| `MemberListItem` | `userID`, `username`, `avatarSrc?`, `online?` | `StatusDot` + Avatar + name. Right panel rows. |
| `Button` | `variant` (primary/secondary/ghost/danger), `size` (sm/md/lg), `disabled?` | All interactive action buttons. |
| `TextInput` | `value`, `placeholder`, `label?`, `error?` | Crimson focus ring. |
| `StatusDot` | `status` (online/away/offline/dnd) | 8px colored circle. Composable into Avatar and MemberListItem. |
| `Loading` | `size?`, `label?` | Spinner for async states. |

#### Tier 2 — Useful but watch Mitosis limits

| Component | Notes |
|---|---|
| `SearchBar` | TextInput + leading search icon. Icon rendering differs slightly between Svelte and RN. |
| `EmptyState` | Centered icon + headline + sub-copy. Fully stateless. |
| `Tooltip` | Hover-triggered overlay. Mitosis can output the structure; web uses CSS `:hover`, RN uses `onPressIn`. May need per-platform override. |

### What Mitosis does NOT handle

- **Complex lifecycle** — `MessageBox` (scroll ref, `onMount`, `$effect`), `ChatInput` (textarea auto-grow)
- **Navigation chrome** — `ServerBar`, `ChannelBar`, `FamiliarsList` — layout and routing differ per platform
- **Modals** — Tauri uses DOM overlays; React Native uses `<Modal>` component
- **Platform APIs** — file picker, haptics, push notification registration
- **CSS transitions** — the ServerIcon squircle-to-pill border-radius animation is CSS-only; skip in Mitosis output

Screen-level components are written natively in each framework, composing the shared Mitosis primitives.

---

## Figma Structure (for designers)

### File organization

| File | Purpose |
|---|---|
| **Design System Library** | All primitive components, tokens, styles. Published as a Figma library. |
| **Desktop App** | Screens composed from library components. Tauri-specific layouts. |
| **Mobile App** | Screens composed from library components. React Native-specific layouts. |
| **Archive** | Old explorations, deprecated screens. Keeps other files clean. |

### Page structure inside each file

Use emoji prefixes for scanability:
- `📐 Cover` — file name, version, last updated, owners
- `🧱 Atoms` — smallest primitives (Button, Icon, Avatar, Badge)
- `🔗 Molecules` — composed atoms (SearchBar, MessageInput, ChannelListItem)
- `🏗 Organisms` — composed molecules (Sidebar, MessageList, ServerNav)
- `📄 Pages/Screens` — full screen layouts
- `🗑 Deprecated` — old versions, hidden from library

### Component requirements

1. **Auto Layout on everything.** Auto Layout mirrors CSS flexbox — padding, alignment, spacing translate directly to code. Components without auto layout are nearly useless for handoff.

2. **Variants using Figma's variant system.** Variant properties map 1:1 to code props. A Button should have:
   - Size: small / medium / large
   - Variant: primary / secondary / ghost
   - State: default / hover / active / disabled

3. **Match naming to code.** If the developer calls it `variant="primary"`, the Figma property should be "Variant" with value "Primary". Use slash grouping for component organization: `Button/Primary`, `Button/Secondary`.

4. **Design tokens via Figma Variables.** Three layers:
   - **Primitive tokens** — raw values: `blue-500: #3B82F6`, `spacing-4: 16px`
   - **Semantic tokens** — meaning: `color-primary: blue-500`, `color-error: red-500`
   - **Component tokens** — usage: `button-bg-primary: color-primary`

5. **Tokens Studio plugin** (optional but recommended). Provides a no-code interface to manage tokens and sync token JSON to GitHub. Developers transform the JSON into CSS variables or Tailwind config using Style Dictionary.

---

## Storybook Architecture

A single Storybook process cannot render two frameworks simultaneously — this is a Storybook 8 architectural constraint (native multi-renderer support has been requested since 2019 and has not shipped). The solution is **Storybook Composition**: three separate processes unified under one URL.

```
port 6001  React Storybook   (@storybook/react-vite)   stories from output/react/
port 6002  Svelte Storybook  (@storybook/svelte-vite)  stories from output/svelte/
port 6000  Composition host  (refs: 6001 + 6002)       ← developers open this URL
```

The host at `:6000` shows a unified sidebar with **React** and **Svelte** sections. Clicking a story renders the appropriate framework in an iframe. `pnpm storybook` starts all three processes and opens the host.

Story metadata is written once in `*.stories-shared.ts` files co-located with each Mitosis source, and thin per-framework wrapper files (generated by `scripts/gen-story-wrappers.ts`) add only the `component` import. See `docs/packages.md` for the full file layout and code examples.

---

## Figma ↔ Storybook Linking

Three tools create the bidirectional connection:

### 1. Storybook Connect (Figma plugin by Chromatic)

Embeds live, interactive Storybook stories inside Figma. Designer selects a component in Figma → pastes the Storybook URL → every instance shows a "View story" link. Chromatic auto-updates links when Storybook is redeployed.

### 2. Storybook Designs addon (in Storybook)

The reverse direction. Developers add a `design` parameter to stories that embeds the Figma component inside Storybook:

```ts
export const Primary = {
  args: { variant: 'primary', children: 'Click me' },
  parameters: {
    design: {
      type: 'figma',
      url: 'https://www.figma.com/file/xxx/Design-System?node-id=123:456',
    },
  },
};
```

### 3. story.to.design (Figma plugin)

Generates and syncs Figma components from Storybook. After developers publish a component, this plugin imports it into Figma as a real component with proper variants. Code updates can be pulled back into Figma.

---

## Workflow

### Day-to-day

1. **Designer** creates or updates a primitive in Figma — auto layout, variants, semantic tokens.
2. **Designer** hands off via Figma Dev Mode. Developers see exact tokens, spacing, and variant properties.
3. **Developers** implement the component as a Mitosis `.lite.tsx` file. Write Storybook stories for every variant.
4. **Developers** publish Storybook to Chromatic. Storybook Connect links update automatically in Figma.
5. **Designer** reviews in Figma — opens Storybook Connect, compares live component to design.
6. **Designer** uses published primitives to design full screens for desktop and mobile.

### Roles

| Responsibility | Owner |
|---|---|
| Figma components, tokens, variants | Designer |
| Figma file organization and library publishing | Designer |
| Screen layouts and prototyping | Designer |
| Mitosis `.lite.tsx` implementation | Developers |
| Storybook stories and publishing | Developers |
| Linking Storybook ↔ Figma | Developers (initial setup), both maintain |
| Reviewing implementation matches design | Both |

---

## Figma → Code Pipeline (with Builder.io Visual Copilot)

For faster handoff, Builder.io's **Visual Copilot** Figma plugin can convert designs into Mitosis code directly. The flow:

1. Design in Figma
2. Generate Mitosis components via Visual Copilot
3. Review and clean up generated `.lite.tsx` files
4. Compile to Svelte + React
5. Publish to Storybook

This accelerates the initial implementation but generated code always needs review — treat it as a starting point, not final output.
