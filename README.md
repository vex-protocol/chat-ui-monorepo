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
| `apps/desktop` | Desktop client — Tauri 2.0 + Svelte |
| `apps/mobile` | Mobile client — React Native |
| `packages/types` | Shared TypeScript interfaces and enums |
| `packages/core` | Framework-agnostic client SDK (WebSocket, auth, messaging) |
| `packages/crypto` | NaCl encryption, key management |
| `packages/ui` | Mitosis design primitives → Svelte + React |

The server (**spire**) lives in its own repo: [`vex-chat/spire`](https://github.com/vex-chat/spire).

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

### 2. Start development

```bash
# From the repo root — starts client apps in parallel
pnpm dev
```

The server (spire) runs separately from its own repo. See the [spire repo](https://github.com/vex-chat/spire) for server setup.

---

## Documentation

**`docs/reference/`** — structured info, API tables, configuration

| Doc | What it covers |
|---|---|
| [`vex-overview.md`](docs/vex-overview.md) | What Vex is, the cryptographic protocol, HTTP API, WebSocket protocol, brand |
| [`glossary.md`](docs/glossary.md) | Central definitions: OTK, X3DH, mail, device key, NaCl, and more |
| [`packages.md`](docs/reference/packages.md) | Shared packages overview: types, crypto, dependency graph |
| [`packages-libvex.md`](docs/reference/packages-libvex.md) | VexClient SDK: typed events, async iterators, discriminated unions |
| [`packages-store-ui.md`](docs/reference/packages-store-ui.md) | Nanostores state layer + Mitosis design system primitives |

**`docs/architecture/`** — Architecture Decision Records (ADRs)

| Doc | What it covers |
|---|---|
| [`adr-001-monorepo-consolidation.md`](docs/architecture/adr-001-monorepo-consolidation.md) | Why five repos became one monorepo, every technology replacement, trade-offs accepted |
| [`adr-003-tracing-over-logging.md`](docs/architecture/adr-003-tracing-over-logging.md) | Why OTel tracing instead of log shipping — privacy-first observability with 13 attributes and zero PII |
| [`adr-004-website-reimplementation.md`](docs/architecture/adr-004-website-reimplementation.md) | Reimplement vex.wtf: SvelteKit static site, SSR deep links, SEO, Vercel |

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
| [`reliability.md`](docs/ops/reliability.md) | SLOs, error budgets, observability (OpenTelemetry + Honeycomb) |

**Recommended reading order for new contributors:**
1. This README
2. `docs/vex-overview.md` — understand what we're building and why
3. `docs/reference/packages.md` — understand the shared package layer

---

## Contributing

1. Check available work: `bd ready`
2. Create a branch, make changes
3. Run relevant package tests before committing
