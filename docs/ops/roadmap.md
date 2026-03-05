# Roadmap

What we're building, in what order, and why. This is the strategy layer — the big picture. Technical issues and day-to-day execution live in Linear.

> Review every 6 weeks or when a release ships. Last updated: March 2026.

---

## Now — Active

High confidence in scope. Ship these first.

**Release goal: "Encrypted chat that doesn't lose messages or leak keys"**

| Priority | What | Why | Journey |
|---|---|---|---|
| **P0** | Multi-device fan-out | We send to `devices[0]` only. If you have two devices, one never gets the message. Fundamental regression from the old client | 4, 5, 10 |
| **P0** | OTK ownership verification | Any authenticated user can upload OTKs to any device. An attacker can inject their key material and intercept messages. MITM on the encryption layer | 4 |
| **P0** | Mail save error propagation | `saveMail().catch(() => {})` silently drops messages. OTK is consumed, session advanced, plaintext gone forever | 4, 5 |
| **P1** | File attachment UI | Backend and SDK are done. Desktop needs file picker in ChatInput, inline rendering in MessageBox, upload progress | 12 |
| **P1** | Logout state cleanup | `clearCredentials()` only removes localStorage. Nanostores atoms retain previous user's data in memory | 16 |
| **P1** | Auth rate limiting | Only global rate limit (500/15min). Login and register need dedicated limits to prevent brute-force | 1, 2 |

**Exit criteria:**
- Messages delivered to all recipient devices
- OTK uploads require proof of device ownership
- Mail pipeline errors propagate visibly
- Login/register have dedicated rate limits
- Logout clears all in-memory state
- Files can be sent and rendered in desktop chat

---

## Next — Scoping

Confident these matter. Scope not fully defined yet. May re-order based on what we learn shipping Now.

**Release goal: "Complete communication — groups, history, search"**

| Priority | What | Why | Journey | Depends on |
|---|---|---|---|---|
| **P0** | Local message persistence | Close the app, lose all messages. Single biggest UX regression. Old client had SQLite with at-rest encryption | 3, 4, 5 | — |
| **P0** | Group messaging UI | Users can see channels but can't post. Backend done, UI disabled. Need member list endpoint + fan-out | 10 | Multi-device fan-out |
| **P1** | Desktop user search | Desktop requires knowing a userID to message someone. Mobile already has search | 6 | — |
| **P2** | Invite join atomicity | `POST /invite/:id/join` runs 3 separate DB calls without a transaction. Concurrent joins create duplicates | 9 | — |
| **P2** | Message forwarding to own devices | Sender's other devices don't see messages they sent from this device | 4, 5 | Multi-device fan-out |
| **P2** | Device management UI | SDK has `listDevices()` but no UI for viewing, adding, or removing devices | 14 | — |

**Open questions:**
- Message persistence: SQLite via Tauri SQL plugin? IndexedDB? Need to evaluate both for desktop. Mobile needs SQLite regardless
- Group fan-out: O(members x devices) encryptions per message. Need to benchmark and possibly batch
- Desktop search: full-text search of local history, or just user lookup?

---

## Later — Future

Important but not scoped. May never ship if priorities change. That's fine.

| Priority | What | Journey | Notes |
|---|---|---|---|
| P2 | Real-time username availability on register | 1 | UX improvement, not critical |
| P2 | Encrypted key export/import for device migration | 1, 14 | Enables moving between devices |
| P2 | BIP39 mnemonic fingerprints (replace hex) | 7 | More human-friendly for voice verification |
| P3 | Mobile deep links (`vex://` URLs) | 9 | Required for invite flow on mobile |
| P3 | Key change detection + re-verify prompt | 7 | Important for trust UX |
| P3 | Sound effects | 1, 2, 4 | Polish |
| P3 | Full settings page | 15 | Notifications, sounds, DM toggle, account management |
| P3 | Channel categories | 11 | Collapsible groups in server sidebar |
| P4 | Account deletion | 15 | Privacy feature, needs design |
| P4 | Custom emoji | 10, 11 | Nice-to-have, large effort |
| P4 | Moderation tools (kick/ban) | 11 | Needed when servers grow |

---

## Done

Shipped. Pruned periodically.

| What | Shipped |
|---|---|
| Spire server reimplementation (Kysely, Zod, Vitest, ESM) | v0.1 |
| App shell: routing, layout, window chrome | v0.1 |
| Auth UI: login, register, key management | v0.1 |
| App bootstrap sequence | v0.1 |
| Nanostores state layer | v0.1 |
| SDK crypto: SessionManager, box encrypt/decrypt | v0.1 |
| Mitosis design primitives (Svelte + React) | v0.1 |
| React Native mobile scaffold | v0.1 |
| PBKDF2 security fix (1,000 -> 210,000 iterations) | v0.1 |
| Mail + keys HTTP routes and WS delivery | v0.1 |
| packages/crypto | v0.1 |
| packages/types | v0.1 |
