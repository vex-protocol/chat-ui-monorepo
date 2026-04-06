# Vex Platform Overview

> Source: vex.wtf (SPA — requires JS), github.com/vex-chat org, upstream source repos

**Vex** is an end-to-end encrypted, privacy-first chat platform built by **Vex Heavy Industries LLC** ("Privacy enthusiasts", US). All source code is released under **AGPL-3.0**.

---

## What Vex Is

A self-hosted, open-source alternative to Discord or Slack where:
- All messages are **end-to-end encrypted** — the server stores only ciphertext, never plaintext
- **Identity is device-key-bound** — users are identified by their NaCl Ed25519 signing key, not a username/email alone
- **No surveillance by design** — the server cannot read messages, cannot impersonate users, and cannot forge device signatures
- Multi-device support via per-device signing key pairs and shared pre-key bundles

---

## Components

### Original repos (upstream reference)

| Repo | Description | Language |
|---|---|---|
| `spire` | Server — HTTP API + WebSocket | TypeScript (Node.js) |
| `libvex-js` | Client library | TypeScript |
| `vex-desktop` | Electron desktop client (Windows / macOS / Linux) | TypeScript |
| `vex-web` | Web client | TypeScript |
| `types-js` | Shared protocol types (`IUser`, `IMail`, `IDevice`, etc.) | TypeScript |
| `crypto-js` | NaCl crypto utilities (`XUtils`, `xMakeNonce`, key encoding) | TypeScript |

### New monorepo structure (this repo)

| Package | Replaces | Description |
|---|---|---|
| `apps/desktop` | `vex-desktop` | Tauri 2.0 + Svelte (replaces Electron+React) |
| `apps/mobile` | -- | React Native mobile client (new) |
| `packages/store` | -- | Framework-agnostic state containers (nanostores atoms) |
| `packages/ui` | -- | Mitosis design primitives, compiled to Svelte + React |

### Sibling repos (linked via pnpm workspace)

| Repo | npm name | Replaces | Description |
|---|---|---|---|
| `../types-js` | `@vex-chat/types` | `types-js` | Shared TypeScript interfaces and enums |
| `../crypto-js` | `@vex-chat/crypto` | `crypto-js` | Ed25519 signing, X25519 DH, secretbox encryption (`@noble/curves`) |
| `../libvex-js` | `@vex-chat/libvex` | `libvex-js` | Framework-agnostic client SDK (WebSocket, auth, messaging) |

These were originally in `packages/` but migrated to standalone sibling repos. They are linked into the pnpm workspace so monorepo packages can import them as `"workspace:*"` deps.

The server (**spire**) stays in its own repo ([`vex-chat/spire`](https://github.com/vex-chat/spire)) — Express 4, Kysely, @noble/curves, argon2id, SQLite/MySQL. Spire is NOT in the pnpm workspace.

See `docs/explanation/platform-strategy.md` for architecture details and `docs/explanation/design-system.md` for the Figma ↔ Storybook pipeline.

---

## Cryptographic Protocol

Vex uses **@noble/curves** (Ed25519/Curve25519) throughout — both the client packages and the server. The original upstream used TweetNaCl; both repos have been migrated to @noble/curves for RFC 8032 compliance and active maintenance.

### Key hierarchy

```
User
└── Device (NaCl Ed25519 signing key pair — generated on device, private key never leaves client)
    ├── signKey       — long-term identity key; 64 hex chars public key stored on server
    ├── preKey        — medium-term key; signed by signKey; used to initiate sessions
    └── oneTimeKeys   — single-use keys; consumed during initial key exchange (X3DH-style)
```

### Session establishment (X3DH-style)

1. Sender fetches recipient's **key bundle** from server: `{ signKey, preKey, otk? }`
2. Sender derives a shared secret from the key bundle
3. Sender encrypts message with the shared secret + nonce
4. OTK is consumed (deleted server-side) as part of key bundle retrieval
5. Subsequent messages use a ratchet session (`ISessionCrypto` — SK + fingerprint)

### Mail format

Encrypted messages are called **mail**. Each mail record stored on the server:
```
{ nonce, cipher, header, mailType, recipient (deviceID), sender (deviceID),
  group?, authorID, readerID, forward?, time }
```
- `cipher` — ciphertext (server never sees plaintext)
- `nonce` — 24-byte NaCl nonce
- `header` — encrypted session header
- `recipient` — addressed to a specific **device**, not a user

### Server signing key (SPK)

The server itself has a NaCl signing key pair (SPK). The server's public key is shared with clients for verifying server-signed payloads. The private SPK is the `SPK` env var in the original spire.

---

## HTTP API (spire endpoints)

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/auth` | — | Login; returns JWT + sets `auth` cookie |
| `POST` | `/register` | — | Register user+device (requires NaCl-signed register token) |
| `GET` | `/token/:type` | JWT (except `register`) | Get scoped action token |
| `POST` | `/whoami` | JWT | Get current user info |
| `POST` | `/goodbye` | JWT | Logout (invalidates JWT) |
| `POST` | `/mail` | JWT + device | Send encrypted mail |
| `GET` | `/user/:id` | — | Get user info (censored) |
| `GET` | `/user/:id/devices` | JWT | List user's devices |
| `POST` | `/user/:id/devices` | JWT | Register additional device |
| `POST` | `/device/:id/connect` | JWT | Authenticate device (issues device JWT) |
| `POST` | `/device/:id/keyBundle` | JWT | Fetch key bundle (consumes OTK) |
| `POST` | `/device/:id/mail` | JWT + device | Fetch inbox |
| `POST` | `/server/:name` | JWT | Create server |
| `GET/DELETE` | `/server/:id` | JWT | Get/delete server |
| `POST/GET` | `/server/:id/channels` | JWT | Manage channels |
| `POST/GET` | `/server/:id/invites` | JWT | Manage invites |
| `WS` | `/socket` | JWT | Real-time event stream |

### Token types

`file`, `avatar`, `register`, `device`, `invite`, `emoji`, `connect`

All tokens expire in 10 minutes. Clients must NaCl-sign the token UUID with their device key before submitting it to the server.

---

## WebSocket Protocol

After connecting, clients receive real-time `notify` events:

```
{ type: "notify", event: string, transmissionID: string, data?: any }
```

Common events: `mail` (new message), `serverChange` (server/channel updated).

Connection flow:
1. Client fetches a `connect` action token → signs it with device key
2. `POST /device/:id/connect` → server issues a `device` JWT (cookie)
3. Client opens WS `/socket` with both `auth` + `device` cookies
4. Server verifies both JWTs, creates `ClientManager` for the connection

---

## Brand and Mission

**Tagline:** "PRIVATE CHAT FOR SENSITIVE YOUNG MEN" / "PRIVACY IS NOT A CRIME"

Vex positions itself as a privacy-respecting alternative to surveillance-based platforms:
> "We hate Slack, Discord, Microsoft Teams, and all the rest. Every message you send on those platforms is analyzed, stored, and used to build a profile of you and your conversations. Vex is different."

---

## Privacy Policy Highlights

From the `vex-chat/privacy-policy` repo and vex.wtf:

### What Vex collects
- Login credentials (username + PBKDF2 password hash — never plaintext)
- OS type (device metadata)
- Encrypted messages (ciphertext only — server cannot read content)

### What Vex does NOT collect
- **IP addresses** — not logged or stored at all
- **User-Agent strings** — not logged or stored at all
- Message plaintext — end-to-end encrypted; server sees only ciphertext

### Hard implementation requirements (from privacy policy)
1. **Mail is deleted from the server after it is fetched by the intended recipient.** The server is a relay, not a storage service. Once delivered, messages are gone.
2. **IP addresses and User-Agent strings must never be logged or stored.** This is described as "unusual, but very important in protecting your privacy."

### Other notes
- Device keys are generated on the client device and private keys never leave the device
- AGPL-3.0 ensures any server modifications must be open-sourced

---

## What We Are Building

This monorepo provides **shared packages and client apps**. The server (spire) lives in its own repo ([`vex-chat/spire`](https://github.com/vex-chat/spire)).

---

See also: [auth-comparison.md](explanation/auth-comparison.md) for auth design decisions, [glossary.md](glossary.md) for term definitions.
