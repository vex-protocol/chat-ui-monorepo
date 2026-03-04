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
pnpm --filter spire setup
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
pnpm --filter spire dev
```

Spire starts on `http://localhost:16777` by default.

### 4. Run the tests

```bash
pnpm --filter spire test
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
| `SPK` | yes | — | NaCl Ed25519 server signing key (hex). `pnpm setup` generates this. |
| `JWT_SECRET` | yes | — | HMAC secret for JWTs, ≥ 32 chars. `pnpm setup` generates this. |
| `API_PORT` | no | `16777` | HTTP port |
| `LOG_LEVEL` | no | `info` | `trace` · `debug` · `info` · `warn` · `error` |
| `NODE_ENV` | no | `development` | `development` · `production` · `test` |

`SPK` and `JWT_SECRET` are intentionally separate — a NaCl Ed25519 private key is not the right shape for HMAC-SHA256.

---

## Documentation

| Doc | What it covers |
|---|---|
| [`docs/vex-overview.md`](docs/vex-overview.md) | What Vex is, the cryptographic protocol, HTTP API, WebSocket protocol, brand |
| [`docs/architecture.md`](docs/architecture.md) | How `apps/spire` is structured, layer rules, file naming, path aliases, error handling |
| [`docs/platform-strategy.md`](docs/platform-strategy.md) | Cross-platform monorepo: Tauri desktop, React Native mobile, shared packages |
| [`docs/design-system.md`](docs/design-system.md) | Figma ↔ Storybook pipeline, Mitosis component strategy |
| [`docs/auth-comparison.md`](docs/auth-comparison.md) | Auth design decisions: NaCl device keys, registration flow, JWT strategy |
| [`docs/testing-strategy.md`](docs/testing-strategy.md) | Test structure, in-memory SQLite, factory helpers, Vitest configuration |
| [`docs/logging.md`](docs/logging.md) | Pino logger setup, IP/UA redaction, dev vs prod transport |
| [`docs/config.md`](docs/config.md) | Env validation, secret hygiene, singleton pattern, Zod v4 utilities |
| [`docs/websocket.md`](docs/websocket.md) | WS connection lifecycle, auth handshake, async handler pattern |
| [`docs/openapi-strategy.md`](docs/openapi-strategy.md) | OpenAPI generation from Zod schemas, Spectral linting |
| [`AGENTS.md`](AGENTS.md) | Implementation rules — start here before contributing |

**Recommended reading order for new contributors:**
1. This README
2. `docs/vex-overview.md` — understand what we're building and why
3. `docs/architecture.md` — understand how the server is structured
4. `AGENTS.md` — implementation rules you must follow
5. `docs/testing-strategy.md` — write tests from day one

---

## Contributing

1. Check available work: `bd ready`
2. Create a branch, make changes, run `pnpm --filter spire test`
3. All 255 tests must pass before committing
4. Follow the layer rules in `docs/architecture.md` — route handlers call service functions, service functions call the database, never the other way around
