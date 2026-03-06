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

The API server — Express + SQLite/Postgres, 255 tests.

### First-time setup

```bash
pnpm --filter @vex-chat/spire env:init
```

Generates `.env` with random SPK and JWT_SECRET. Or copy `.env.example` and fill in manually.

### Run dev server

```bash
pnpm --filter @vex-chat/spire dev
```

Starts on `http://localhost:16777`. Auto-restarts on file changes.

### Run tests

```bash
pnpm --filter @vex-chat/spire test            # run once
pnpm --filter @vex-chat/spire test:watch      # watch mode
pnpm --filter @vex-chat/spire test:coverage   # with coverage
```

Tests use in-memory SQLite — no external services needed.

### Build for production

```bash
pnpm --filter @vex-chat/spire build
node dist/run.js
```

### API docs

```bash
pnpm --filter @vex-chat/spire docs            # interactive docs on localhost:5555
pnpm --filter @vex-chat/spire generate:openapi # regenerate openapi.json
pnpm --filter @vex-chat/spire lint:openapi     # validate schema
```

### Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DB_TYPE` | yes | — | `sqlite` or `postgres` |
| `DATABASE_URL` | if postgres | — | Postgres connection string |
| `SQLITE_PATH` | no | `spire.db` | SQLite file path |
| `SPK` | yes | — | Ed25519 server private key (hex) |
| `JWT_SECRET` | yes | — | HMAC secret, 32+ chars |
| `API_PORT` | no | `16777` | HTTP listen port |
| `LOG_LEVEL` | no | `info` | trace/debug/info/warn/error |
| `OPEN_REGISTRATION` | no | false | Allow unauthenticated registration (dev only) |

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

## Mobile (React Native)

Native iOS and Android client.

### Prerequisites

- macOS for iOS: Xcode 15+, CocoaPods
- Android: Android SDK, NDK, emulator or device

### First-time iOS setup

```bash
pnpm --filter @vex-chat/mobile pod-install
```

### Run dev

```bash
pnpm --filter @vex-chat/mobile ios       # iOS simulator
pnpm --filter @vex-chat/mobile android   # Android emulator
pnpm --filter @vex-chat/mobile dev       # auto-selects (iOS on macOS, Android otherwise)
```

### Metro bundler (standalone)

```bash
pnpm --filter @vex-chat/mobile start
```

Useful if the app needs to reconnect to the bundler.

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
| `packages/crypto` | Ed25519, X3DH, NaCl encryption | desktop, mobile, spire, libvex |
| `packages/libvex` | VexClient SDK (WebSocket, auth, messaging) | desktop, mobile, store |
| `packages/store` | Nanostores reactive state | desktop, mobile |

---

## Run Everything

```bash
pnpm dev
```

Runs all apps in parallel (spire, desktop, website, mobile).

---

## Common Tasks

### New contributor onboarding

```bash
git clone https://github.com/vex-chat/vex-chat.git
cd vex-chat
pnpm install
pnpm --filter @vex-chat/spire env:init
pnpm --filter @vex-chat/spire test          # verify setup
pnpm dev                                     # start everything
```

### Server dev loop

```bash
# Terminal 1
pnpm --filter @vex-chat/spire dev

# Terminal 2
pnpm --filter @vex-chat/spire test:watch
```

Edit `apps/spire/src/` → server restarts + tests rerun automatically.

### Desktop dev loop

```bash
pnpm --filter @vex-chat/desktop dev
```

Edit `apps/desktop/src/*.svelte` → Vite HMR updates the Tauri window.

### Deploy website

Push to `main` → Vercel auto-deploys.

### Deploy server

```bash
pnpm --filter @vex-chat/spire build
# Copy dist/ to server, run: node dist/run.js
```

---

## Dependency Graph

```
apps/spire ──────────────────── packages/crypto
apps/desktop ─── packages/store ─── packages/libvex ─── packages/crypto
                      │                                       │
                      └──────── packages/types ◄──────────────┘
apps/mobile ──── packages/store
apps/website ─── packages/types
packages/ui ──── (standalone, compiles to React + Svelte)
```
