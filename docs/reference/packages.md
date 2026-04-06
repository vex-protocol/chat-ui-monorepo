# Packages Layer

Canonical reference for `packages/*` — the shared TypeScript libraries that power all Vex clients.

---

## Overview

Two packages remain in the monorepo (`store`, `ui`). Three were migrated to standalone sibling repos (`@vex-chat/types` -> `../types-js`, `@vex-chat/crypto` -> `../crypto-js`, `@vex-chat/libvex` -> `../libvex-js`) linked via pnpm workspace.

| Package | npm name | Location | Purpose | Detail |
|---|---|---|---|---|
| `packages/store` | `@vex-chat/store` | monorepo | nanostores atoms: state slices + bootstrap + Client event wiring | [packages-store-ui.md](packages-store-ui.md) |
| `packages/ui` | `@vex-chat/ui` | monorepo | Mitosis design primitives compiled to Svelte + React | [packages-store-ui.md](packages-store-ui.md) |
| `../types-js` | `@vex-chat/types` | sibling repo | Shared protocol interfaces — no runtime deps, no build step | Below |
| `../crypto-js` | `@vex-chat/crypto` | sibling repo | NaCl signing, hex encoding, X3DH session crypto | Below |
| `../libvex-js` | `@vex-chat/libvex` | sibling repo | Framework-agnostic client SDK (fetch + WebSocket) | See libvex-js repo |

`store` and `ui` are `private: true` workspace packages. The sibling repos (`types-js`, `crypto-js`, `libvex-js`) are linked into the pnpm workspace but live outside the monorepo.

---

## Sibling Repos — `@vex-chat/types`, `@vex-chat/crypto`, `@vex-chat/libvex`

These three packages were migrated out of the monorepo into standalone sibling repos. They are linked into the pnpm workspace so monorepo packages can still import them as `"workspace:*"` deps. See each repo for file layouts, design rules, and package.json details:

| Package | Sibling repo | Purpose |
|---|---|---|
| `@vex-chat/types` | `../types-js` | Shared protocol interfaces — no runtime deps, no build step |
| `@vex-chat/crypto` | `../crypto-js` | NaCl signing, hex encoding, X3DH session crypto |
| `@vex-chat/libvex` | `../libvex-js` | Framework-agnostic client SDK (fetch + WebSocket) |

---

## Dependency Graph

```
Sibling repos (external, linked via pnpm workspace):
  ../types-js   (@vex-chat/types)   ◄───────────────────────────────┐
  ../crypto-js  (@vex-chat/crypto)  ◄──────────────────────┐        │
  ../libvex-js  (@vex-chat/libvex)  ─── types + crypto ◄──┘        │
                                                                     │
Monorepo packages:                                                   │
  packages/store ──────── @vex-chat/types + @vex-chat/libvex        │
  packages/ui     ─────── (no runtime deps)                          │
                                                                     │
External:                                                            │
  spire (own repo) ──────────────────────── @vex-chat/crypto (npm)   │
                                                                     │
  apps/desktop ─┬── @vex-chat/store  (atoms are native Svelte stores)│
                └── @vex-chat/ui (/svelte/*)                         │
                                                                     │
  apps/mobile  ─┬── @vex-chat/store + @nanostores/react             │
                └── @vex-chat/ui (/react/*)              ◄───────────┘
```

- `../types-js` (`@vex-chat/types`) — zero runtime deps (sibling repo)
- `../crypto-js` (`@vex-chat/crypto`) — `@noble/curves` + `@noble/hashes` only; no Node.js `Buffer` dependency (sibling repo)
- `../libvex-js` (`@vex-chat/libvex`) — types + crypto + `eventemitter3` + `reconnecting-websocket` (sibling repo)
- `packages/store` — types + libvex + `nanostores`; apps/mobile optionally installs `@nanostores/react`; Svelte needs no adapter
- `packages/ui` — no runtime deps; Mitosis is a devDep only
- `spire` (own repo, NOT in the pnpm workspace) — imports `@vex-chat/crypto` via npm (server has no state management needs)

---

## TypeScript Resolution

- **Root tsconfig:** `"module": "nodenext"` — reads `package.json#exports`
- **Each package:** `"exports": { ".": "./src/index.ts" }` + `allowImportingTsExtensions: true`
- **pnpm `workspace:*`** creates symlinks — no extra `tsconfig.json` `paths` entries needed in consuming apps

---

## Spire Integration

The spire server lives in its own repo ([`vex-chat/spire`](https://github.com/vex-chat/spire)) and consumes `@vex-chat/crypto` via npm. When updating the crypto package, publish to npm so spire can pick up changes.

---

## Verification Checklist

```bash
pnpm -r exec tsc --noEmit            # zero errors across workspace
```

---

See also: [packages-store-ui.md](packages-store-ui.md) for the state layer and design system.
