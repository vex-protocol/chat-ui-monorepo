# Vex

> **Privacy is not a crime.**

Vex is an end-to-end encrypted, self-hosted chat platform — a privacy-first alternative to Discord and Slack.

Every message is encrypted on your device before it leaves. The server stores only ciphertext. It cannot read your messages, cannot impersonate you, and cannot forge device signatures. Your identity is your key pair, not your username.

> "We hate Slack, Discord, Microsoft Teams, and all the rest. Every message you send on those platforms is analyzed, stored, and used to build a profile of you and your conversations. Vex is different."

**License:** AGPL-3.0 — any server modifications must be open-sourced.

---

## What's in this repo

| Package | Description |
|---|---|
| `apps/spire` | Server — HTTP API + WebSocket (Node.js, Express, Kysely, SQLite/Postgres) |
| `apps/desktop` | Desktop client — Tauri 2.0 + Svelte |
| `apps/mobile` | Mobile client — React Native |
| `packages/types` | Shared TypeScript interfaces and enums |
| `packages/core` | Framework-agnostic client SDK (WebSocket, auth, messaging) |
| `packages/crypto` | NaCl encryption, key management |
| `packages/ui` | Mitosis design primitives → Svelte + React |

---

## Quickstart

### Prerequisites

- [mise](https://mise.jdx.dev/) — manages Node.js and pnpm versions automatically
- Or manually: Node.js 24.x and pnpm 10.x

```bash
# Install mise, then let it pick up the pinned versions from mise.toml
mise install
```

### 1. Clone and install

```bash
git clone https://github.com/vex-chat/vex-chat.git
cd vex-chat
pnpm install
```

### 2. Set up environment (spire)

```bash
# Generates apps/spire/.env with a random SPK and JWT_SECRET
pnpm --filter @vex-chat/spire env:init
```

This copies `.env.example` → `.env` and fills in cryptographically generated values. Open `apps/spire/.env` to review or adjust settings (port, log level, database path).

**Manual alternative:** Copy and fill in the template yourself:

```bash
cp apps/spire/.env.example apps/spire/.env
# Edit apps/spire/.env — SPK and JWT_SECRET must be filled in
```

### 3. Start the server

```bash
# From the repo root — starts all apps in parallel
pnpm dev

# Or just the server
pnpm --filter @vex-chat/spire dev
```

Spire starts on `http://localhost:16777` by default.

### 4. Run the tests

```bash
pnpm --filter @vex-chat/spire test
```

255 tests, no external services required — everything runs against an in-memory SQLite database.

---

## Environment variables (spire)

All variables are validated at startup. Missing or invalid values print a clear error and exit immediately rather than crashing mid-request.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DB_TYPE` | yes | — | `sqlite` or `postgres` |
| `DATABASE_URL` | if postgres | — | Postgres connection string |
| `SQLITE_PATH` | no | `spire.db` | Path to SQLite file |
| `SPK` | yes | — | NaCl Ed25519 server signing key (hex). `env:init` generates this. |
| `JWT_SECRET` | yes | — | HMAC secret for JWTs, ≥ 32 chars. `env:init` generates this. |
| `API_PORT` | no | `16777` | HTTP port |
| `LOG_LEVEL` | no | `info` | `trace` · `debug` · `info` · `warn` · `error` |
| `NODE_ENV` | no | `development` | `development` · `production` · `test` |

`SPK` and `JWT_SECRET` are intentionally separate — a NaCl Ed25519 private key is not the right shape for HMAC-SHA256.

---

## Documentation

| Doc | What it covers |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Implementation rules — start here before contributing |

**`docs/reference/`** — structured info, API tables, configuration

| Doc | What it covers |
|---|---|
| [`vex-overview.md`](docs/vex-overview.md) | What Vex is, the cryptographic protocol, HTTP API, WebSocket protocol, brand |
| [`glossary.md`](docs/glossary.md) | Central definitions: OTK, X3DH, mail, device key, NaCl, and more |
| [`architecture.md`](docs/reference/architecture.md) | How `apps/spire` is structured, layer rules, file naming, path aliases, error handling |
| [`testing-strategy.md`](docs/reference/testing-strategy.md) | Test structure, in-memory SQLite, factory helpers, Vitest configuration |
| [`logging.md`](docs/reference/logging.md) | Pino logger setup, IP/UA redaction, dev vs prod transport |
| [`config.md`](docs/reference/config.md) | Env validation, secret hygiene, singleton pattern, Zod v4 utilities |
| [`websocket.md`](docs/reference/websocket.md) | WS connection lifecycle, auth handshake, async handler pattern |
| [`openapi-strategy.md`](docs/reference/openapi-strategy.md) | OpenAPI generation from Zod schemas, Spectral linting |
| [`packages.md`](docs/reference/packages.md) | Shared packages overview: types, crypto, dependency graph |
| [`packages-libvex.md`](docs/reference/packages-libvex.md) | VexClient SDK: typed events, async iterators, discriminated unions |
| [`packages-store-ui.md`](docs/reference/packages-store-ui.md) | Nanostores state layer + Mitosis design system primitives |

**`docs/architecture/`** — Architecture Decision Records (ADRs)

| Doc | What it covers |
|---|---|
| [`adr-001-monorepo-consolidation.md`](docs/architecture/adr-001-monorepo-consolidation.md) | Why five repos became one monorepo, every technology replacement, trade-offs accepted |

**`docs/explanation/`** — why decisions were made, strategy and rationale

| Doc | What it covers |
|---|---|
| [`auth-comparison.md`](docs/explanation/auth-comparison.md) | Auth design decisions: NaCl device keys, registration flow, JWT strategy |
| [`platform-strategy.md`](docs/explanation/platform-strategy.md) | Cross-platform monorepo: Tauri desktop, React Native mobile, shared packages |
| [`design-system.md`](docs/explanation/design-system.md) | Figma ↔ Storybook pipeline, Mitosis component strategy |
| [`desktop-reimplementation.md`](docs/explanation/desktop-reimplementation.md) | Electron → Tauri migration decisions and component mapping |
| [`react-native-monorepo.md`](docs/explanation/react-native-monorepo.md) | Metro + pnpm configuration for React Native in the monorepo |
| [`migration-from-upstream.md`](docs/explanation/migration-from-upstream.md) | API mapping from original vex-chat repos to monorepo |
| [`infrastructure.md`](docs/explanation/infrastructure.md) | Provider selection, deployment strategy, cost analysis |
| [`scalability.md`](docs/explanation/scalability.md) | Performance strategy: SQLite-first, connection pooling, scaling path |

**`docs/how-to/`** — task-oriented guides (planned)

**`docs/tutorials/`** — getting started guides (planned)

**`docs/ops/`** — strategy layer ([README](docs/ops/README.md))

| Doc | What it covers |
|---|---|
| [`journeys.md`](docs/ops/journeys.md) | User journey inventory and feature coverage matrix |
| [`roadmap.md`](docs/ops/roadmap.md) | Now/Next/Later roadmap with priorities and release goals |
| [`concepts.md`](docs/ops/concepts.md) | Story mapping methodology and glossary |
| [`ai-agents.md`](docs/ops/ai-agents.md) | AI agent roles for a small team: PM and scrum |

**Recommended reading order for new contributors:**
1. This README
2. `docs/vex-overview.md` — understand what we're building and why
3. `docs/reference/architecture.md` — understand how the server is structured
4. `AGENTS.md` — implementation rules you must follow
5. `docs/reference/testing-strategy.md` — write tests from day one

---

## Contributing

1. Check available work: `bd ready`
2. Create a branch, make changes, run `pnpm --filter @vex-chat/spire test`
3. All 255 tests must pass before committing
4. Follow the layer rules in `docs/reference/architecture.md` — route handlers call service functions, service functions call the database, never the other way around
