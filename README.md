# Vex

[![CI](https://img.shields.io/github/actions/workflow/status/vex-protocol/vex-chat/ci.yml?branch=master&style=flat-square&logo=github&label=CI)](https://github.com/vex-protocol/vex-chat/actions/workflows/ci.yml)
[![Released](https://img.shields.io/github/release-date/vex-protocol/vex-chat?style=flat-square&label=released)](https://github.com/vex-protocol/vex-chat/releases)
[![License](https://img.shields.io/badge/license-AGPL--3.0--or--later-blue?style=flat-square)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D24.0.0-339933?style=flat-square&logo=nodedotjs)](./package.json)
[![pnpm](https://img.shields.io/badge/pnpm-10.30.3-F69220?style=flat-square&logo=pnpm)](./package.json)
[![OpenSSF Scorecard](https://img.shields.io/ossf-scorecard/github.com/vex-protocol/vex-chat?style=flat-square&label=Scorecard)](https://securityscorecards.dev/viewer/?uri=github.com/vex-protocol/vex-chat)

> **Privacy is not a crime.**

Vex is an end-to-end encrypted, self-hosted chat platform — a privacy-first alternative to Discord and Slack.

Every message is encrypted on your device before it leaves. The server stores only ciphertext. It cannot read your messages, cannot impersonate you, and cannot forge device signatures. Your identity is your key pair, not your username.

> "We hate Slack, Discord, Microsoft Teams, and all the rest. Every message you send on those platforms is analyzed, stored, and used to build a profile of you and your conversations. Vex is different."

**License:** AGPL-3.0 — any server modifications must be open-sourced.

---

## What's in this repo

| Package                  | Description                                                    |
| ------------------------ | -------------------------------------------------------------- |
| `apps/desktop`           | Desktop client — Tauri 2.0 + Svelte 5                          |
| `apps/mobile`            | Mobile client — Expo + React Native                            |
| `packages/store`         | Shared state management (nanostores atoms) + VexService facade |
| `packages/ui`            | Mitosis design primitives → Svelte + React                     |
| `packages/eslint-config` | Shared ESLint base config + SDK-only import restrictions       |

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
