# Dev Workflows

Quick reference for running development tasks in the vex-chat monorepo.

## Prerequisites

- **Node.js** 24.x (via [mise](https://mise.jdx.dev/))
- **pnpm** 10.30.3 (pinned in package.json)
- **Rust** 1.77.2+ (desktop only)

```bash
pnpm install
```

---

## Server (spire)

The server lives in its own repo: [`vex-chat/spire`](https://github.com/vex-chat/spire). See that repo for server setup, environment variables, and development workflow.

---

## Desktop (Tauri + Svelte)

Cross-platform desktop client — macOS, Windows, Linux.

### Prerequisites

- Rust 1.77.2+
- macOS: Xcode command line tools
- Windows: Visual Studio Build Tools
- Linux: GTK 3/4 dev libraries

### Run dev

```bash
pnpm --filter @vex-chat/desktop dev
```

Starts Vite on `localhost:5180` and opens a Tauri window. Frontend hot-reloads.

### Build

```bash
pnpm --filter @vex-chat/desktop build
```

Creates platform-specific binaries (dmg, msi, AppImage).

### Type check

```bash
pnpm --filter @vex-chat/desktop check
```

---

## Mobile (Expo + React Native)

Native iOS and Android client via Expo Prebuild (CNG). `ios/` and `android/` directories are gitignored — generated from `app.json` + config plugins.

### Prerequisites

- macOS for iOS: Xcode 16+
- Android: Android SDK, emulator or device
- `npx expo prebuild` generates native projects from config

### First-time setup

```bash
cd apps/mobile
npx expo prebuild          # generates ios/ and android/
```

### Development build (recommended)

```bash
npx expo run:ios           # builds native + launches on iOS simulator
npx expo run:android       # builds native + launches on Android emulator
```

After the first build (~2-5 min), subsequent launches are fast. JS changes hot-reload instantly.

### Expo Go (quick JS-only testing)

```bash
npx expo start             # opens in Expo Go on device/simulator
```

Expo Go has a fixed set of native modules. Packages with custom native code (`@notifee/react-native`, etc.) will crash in Expo Go — use a development build instead. See `docs/explanation/platform-strategy.md` for the full Expo Go vs dev build comparison.

### Metro bundler (standalone)

```bash
npx expo start --dev-client   # connects to an existing development build
```

Useful if the app needs to reconnect to the bundler after the native binary is already running.

---

## Website (SvelteKit)

Marketing site at vex.wtf — SvelteKit + Tailwind, deployed to Vercel.

### Run dev

```bash
pnpm --filter @vex-chat/website dev
```

### Build + preview (production)

```bash
pnpm --filter @vex-chat/website build && pnpm --filter @vex-chat/website preview
```

Run Lighthouse against the preview URL (not dev server) for accurate performance scores. The dev server serves unminified, unbundled JS.

### SEO testing

1. Build and preview:
   ```bash
   pnpm --filter @vex-chat/website build && pnpm --filter @vex-chat/website preview
   ```
2. Open Chrome DevTools → Lighthouse tab
3. Run audit against `http://localhost:4173`
4. Check: Performance, Accessibility, SEO scores

Key SEO files:
- `src/lib/seo/Meta.svelte` — OG tags, Twitter cards, canonical URLs
- `src/lib/seo/JsonLd.svelte` — Structured data
- `src/routes/sitemap.xml/+server.ts` — Sitemap
- `src/lib/data/competitors.ts` — Competitor page data

### Optimize orb images

```bash
node apps/website/scripts/optimize-orbs.mjs
```

Converts all images in `static/orbs/` to WebP at 200px, quality 60.

### Type check

```bash
pnpm --filter @vex-chat/website check
```

---

## Component Library (Mitosis → React + Svelte)

Framework-agnostic components compiled to both React and Svelte.

### Build components

```bash
pnpm --filter @vex-chat/ui build           # both targets
pnpm --filter @vex-chat/ui build:react     # React only
pnpm --filter @vex-chat/ui build:svelte    # Svelte only
```

Output goes to `output/react/` and `output/svelte/`.

### Run Storybook

```bash
pnpm --filter @vex-chat/ui storybook
```

Starts three servers:
- **React stories**: `http://localhost:6001`
- **Svelte stories**: `http://localhost:6002`
- **Composition host**: `http://localhost:6000` (both side-by-side)

### Development loop

1. Write components in `src/*.tsx` (Mitosis syntax)
2. Run `pnpm build` to compile
3. View in Storybook
4. Import in apps: `@vex-chat/ui/react/Button` or `@vex-chat/ui/svelte/Button`

---

## Shared Packages

These have no build step — apps import TypeScript source directly.

| Package | Purpose | Used by |
|---|---|---|
| `packages/types` | Shared TypeScript interfaces | all apps + packages |
| `packages/crypto` | Ed25519, X3DH, NaCl encryption | desktop, mobile, libvex (also consumed by spire via npm) |
| `packages/libvex` | VexClient SDK (WebSocket, auth, messaging) | desktop, mobile, store |
| `packages/store` | Nanostores reactive state | desktop, mobile |

---

## Run Everything

```bash
pnpm dev
```

Runs all client apps in parallel (desktop, website, mobile). The server (spire) runs separately from its own repo.

---

## Common Tasks

### New contributor onboarding

```bash
git clone https://github.com/vex-chat/vex-chat.git
cd vex-chat
pnpm install
pnpm dev                                     # start client apps
```

### Desktop dev loop

```bash
pnpm --filter @vex-chat/desktop dev
```

Edit `apps/desktop/src/*.svelte` → Vite HMR updates the Tauri window.

### Deploy website

Push to `main` → Vercel auto-deploys.

---

## Dependency Graph

```
apps/desktop ─── packages/store ─── packages/libvex ─── packages/crypto
                      │                                       │
                      └──────── packages/types ◄──────────────┘
apps/mobile ──── packages/store
apps/website ─── packages/types
packages/ui ──── (standalone, compiles to React + Svelte)

External:
spire (own repo) ── @vex-chat/crypto (via npm)
```
