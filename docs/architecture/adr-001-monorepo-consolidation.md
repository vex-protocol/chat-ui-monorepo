# ADR-001: Consolidate multi-repo Vex ecosystem into a single monorepo with full reimplementation

## Status

Accepted

## Context

The Vex platform was originally built across five+ independent repositories:

| Repo | Role | Stack |
|------|------|-------|
| `vex-desktop` | Desktop client | Electron 28, React 17, Redux, Webpack 5 |
| `spire` | Server | Express 4, Kysely, MySQL/SQLite dual, PBKDF2, Morgan/Winston |
| `libvex-js` | Client SDK | 3,114-line monolithic `Client.ts`, Kysely/SQLite local DB |
| `crypto-js` | Crypto primitives | TweetNaCl, custom encoding |
| `types-js` | Shared types | Manual interface definitions |

**Problems with the old architecture:**

1. **Version coordination hell.** Five repos with circular publish dependencies. `RELEASING.md` in libvex documented a fragile multi-step publish order (types → crypto → libvex → apps). A single breaking change in `types-js` required synchronized releases across all repos.

2. **Monolithic SDK.** `Client.ts` at 3,114 lines contained authentication, key exchange, message loop, WebSocket management, file handling, and session storage in a single class. Untestable, hard to reason about, impossible to tree-shake.

3. **No mobile story.** The architecture was tightly coupled to Node.js and Electron. libvex depended on `sqlite3` (native addon), `ws` (Node-only), and `knex` — none of which ran on React Native without shims.

4. **Outdated cryptography.** TweetNaCl is unmaintained (last release 2018). No TypeScript types. No audit trail. Password hashing used PBKDF2 with 1,000 iterations (dangerously low by 2024 standards).

5. **No tests, no docs.** Spire had zero unit tests. No architecture documentation. No OpenAPI spec. Contributing required reverse-engineering the codebase.

6. **Electron overhead.** ~200MB binary for a chat app. Chromium security surface. No native system tray integration without plugins. Context isolation was bolted on after initial design.

7. **Duplicate schemas.** Types defined in `types-js` as interfaces, re-validated ad-hoc in spire routes, re-defined again in migration files. Three sources of truth for every data shape.

**Constraints:**
- Solo developer
- Must support desktop + mobile from day one
- Privacy-first: server must never see plaintext
- Must preserve the core Vex protocol (X3DH, device-bound identity, server-signed keys)

## Decision

Consolidate everything into a single pnpm monorepo (`vex-chat`) and reimplement all components with modern tooling:

```
vex-chat/
├── apps/
│   ├── spire/          # Server (own repo, not in monorepo): Express 4, Kysely, SQLite
│   ├── desktop/        # Desktop: Tauri 2.0 + Svelte 5
│   └── mobile/         # Mobile: React Native 0.84
├── packages/
│   ├── types/          # Protocol interfaces (zero deps)
│   ├── crypto/         # @noble/curves + @noble/hashes
│   ├── libvex/         # Framework-agnostic client SDK
│   ├── store/          # nanostores state management
│   └── ui/             # Mitosis → Svelte + React components
```

### Key technology replacements

| Layer | Old | New | Why |
|-------|-----|-----|-----|
| **Desktop runtime** | Electron 28 | Tauri 2.0 (Rust) | ~10MB vs ~200MB binary, native security sandbox, no Chromium |
| **Desktop UI** | React 17 + Redux | Svelte 5 | Smaller bundle, no virtual DOM, reactive by default |
| **Mobile** | _(none)_ | React Native 0.84 | Shared `store` + `libvex` packages, native performance |
| **Cross-platform UI** | _(none)_ | Mitosis | Write once, compile to Svelte + React components |
| **State management** | Redux (14 reducers) | nanostores | Framework-agnostic, <1KB, works in Svelte + React |
| **Server framework** | Express 4 | Express 5 | Async error handling, modern router |
| **ORM** | ~~Knex (query builder)~~ | Kysely (type-safe SQL) | Full TypeScript inference, no runtime type errors — **done** |
| **Database** | MySQL + SQLite dual | better-sqlite3 only | Synchronous, no native addon build issues, simpler ops |
| **Schema validation** | Manual checks | Zod v4 → OpenAPI | Single source of truth: Zod schema → TS type → OpenAPI spec |
| **Crypto signing** | TweetNaCl | @noble/curves (Ed25519) | Audited, maintained, TypeScript-native, ESM |
| **Crypto hashing** | PBKDF2 (1K rounds) | argon2id | Memory-hard, OWASP recommended |
| **Key derivation** | Custom KDF | @noble/hashes (HKDF-SHA256) | Standards-compliant, audited |
| **Logging** | Morgan + Winston | Pino | Structured JSON, IP/UA redaction built-in |
| **WebSocket (client)** | ws (Node-only) | reconnecting-websocket | Works in browser + Node + React Native |
| **Binary protocol** | MessagePack | JSON over WebSocket | Simpler debugging, negligible perf diff at Vex scale |
| **Testing** | Jest (0 tests) | Vitest (255+ tests) | Faster, native ESM, in-memory SQLite test helpers |
| **Package manager** | npm (per-repo) | pnpm 10 workspaces | Strict deps, workspace protocol, catalog for shared versions |
| **Build** | Webpack 5 + Babel | Vite 7 + tsc | Native ESM, faster dev server, simpler config |

> **Note:** Most server-side replacements (Express 5, Pino, Zod) were planned but not implemented. Kysely has shipped — both spire and libvex-js now use Kysely instead of Knex. Spire remains in its own repo using Express 4, Winston, and CJS. The client-side replacements (Tauri, Svelte, nanostores, @noble/curves, Mitosis) all shipped. See `docs/ops/roadmap.md` Later section for remaining spire modernization.

### Architectural changes

1. **Modular libvex.** The 3,114-line `Client.ts` is decomposed into `client.ts`, `auth.ts`, `devices.ts`, `servers.ts`, `users.ts`, `mail.ts`, `session.ts`, `connection.ts`, `http.ts`, `iterators.ts`, and `bot/router.ts`. Each module is independently testable.

2. **No local database in the SDK.** Old libvex embedded Knex + SQLite for local key/message storage (now replaced with Kysely). New libvex uses `EventEmitter3` — it emits `DecryptedMail` events and lets the app layer decide storage (Tauri fs, React Native AsyncStorage, IndexedDB, etc.). Key storage is injected via a `KeyStore` interface.

3. **Layer enforcement.** `eslint-plugin-boundaries` enforces the dependency graph at lint time: `types → crypto → libvex → store → apps`. No package can import "upward."

4. **Zod as single source of truth.** Every API shape is a Zod schema that generates: (a) the TypeScript type, (b) the request/response validator, (c) the OpenAPI spec. No duplicate definitions.

5. **Domain-sliced server.** Spire is organized by domain (`auth/`, `devices/`, `keys/`, `mail/`, `servers/`, `permissions/`, `invites/`, `files/`, `ws/`) with explicit layer rules: route handler → service function → database. Path aliases (`#auth`, `#devices`, etc.) enforce module boundaries.

6. **Diátaxis documentation.** `docs/` organized into `reference/`, `explanation/`, `how-to/`, and `tutorials/` following the Diátaxis framework.

## Rationale

1. **Solo developer reality.** Coordinating releases across five repos with npm publish ordering is unsustainable for one person. A monorepo with `pnpm workspace:*` protocol eliminates version coordination entirely — packages always consume the latest local code.

2. **Mobile requires platform-agnostic SDK.** The old libvex couldn't run on React Native (native SQLite addon, Node-only `ws`). Rewriting libvex as a thin event-emitting client with injected storage makes it portable to any JavaScript runtime.

3. **Tauri over Electron is a categorical improvement.** 10MB vs 200MB binary. Rust sandbox vs Chromium attack surface. Native webview vs bundled browser. For a privacy-focused app, the security model matters.

4. **TweetNaCl is a liability.** Unmaintained since 2018, no TypeScript types, not audited. The @noble suite (curves, hashes, ciphers) is audited by Cure53, actively maintained, TypeScript-native, and tree-shakeable.

5. **255 tests vs 0 tests.** The old codebase had zero automated tests. Starting fresh with Vitest, in-memory SQLite, and test factories means every domain has coverage from day one.

## Trade-offs

### What we're giving up

- **Git history continuity.** The old repos' commit history is not carried forward. The five repos remain archived in `~/Public` for reference but are not git-subtree-merged.

- **Incremental migration path.** This is a full rewrite, not a gradual port. Features must be reimplemented before they're available. There is no hybrid period where old and new coexist.

- **MySQL support.** The old spire supported MySQL for production deployments. Current spire uses SQLite exclusively. Self-hosters who ran MySQL must migrate.

- **MessagePack wire format.** The binary protocol is replaced with JSON over WebSocket. At Vex's scale (<1K concurrent users), the bandwidth difference is negligible, but it's a protocol-breaking change.

- **Electron ecosystem plugins.** Electron's vast plugin ecosystem (auto-updater, crash reporter, protocol handler) must be replaced with Tauri equivalents or native Rust implementations.

### Why this is acceptable

- Solo developer: there are no other contributors whose workflow is disrupted by a rewrite.
- The old codebase had zero tests and zero documentation — there is minimal proven-correct behavior to preserve.
- The core protocol (X3DH key exchange, device-bound identity, server-signed keys) is preserved and re-implemented with audited cryptographic libraries.
- The old repos remain accessible for reference at any time.

## Consequences

### Positive

- **Single `pnpm install` + `pnpm dev`** starts the entire stack (server, desktop, mobile).
- **Atomic cross-package changes.** A protocol change in `types` propagates immediately to `crypto`, `libvex`, `store`, and all apps — caught by TypeScript at build time, not at npm publish time.
- **Mobile client exists.** React Native app shares `libvex`, `store`, `types`, and `crypto` packages. No code duplication.
- **Cross-platform UI components.** Mitosis compiles design system components to both Svelte (desktop) and React (mobile) from a single source.
- **Audited cryptography.** @noble/curves and @noble/hashes are Cure53-audited with active maintenance.
- **Type-safe shared packages.** TypeScript catches API mismatches at compile time across all shared packages.
- **Enforced architecture.** eslint-plugin-boundaries prevents dependency violations. Layer rules are lint errors, not conventions.

### Negative

- **Full rewrite risk.** Features from the old desktop client (emoji picker, file preview, audio player, settings UI, auto-updater, protocol handler) must be rebuilt from scratch.
- **Tauri maturity.** Tauri 2.0 is newer than Electron with a smaller ecosystem. Some platform-specific behaviors may require Rust plugins.
- **SQLite-only limits horizontal scaling.** A single-server SQLite deployment cannot scale to multiple server instances. This is acceptable at current scale but would require revisiting for federation.

### Mitigation

- Old repos preserved at `~/Public/vex-desktop`, `~/Public/spire`, `~/Public/libvex-js` for reference during reimplementation.
- Beads issue tracker captures every feature gap and dependency between implementation tasks.
- SQLite → PostgreSQL migration path is straightforward via Kysely's multi-dialect support if horizontal scaling is ever needed.

## Revisit Triggers

- **Team grows beyond 1.** If contributors join, evaluate whether the monorepo's single-branch workflow needs protected branches, CODEOWNERS, or workspace-level CI.
- **Federation requirement.** If Vex needs multiple server instances, revisit SQLite-only decision in favor of PostgreSQL.
- **Tauri blockers.** If Tauri 2.0 cannot deliver a required desktop capability (e.g., system tray, deep linking, auto-update), evaluate whether a Rust plugin or alternative runtime is needed.
- **Scale exceeds 10K concurrent users.** Revisit JSON-over-WebSocket vs binary protocol, and SQLite vs PostgreSQL.
