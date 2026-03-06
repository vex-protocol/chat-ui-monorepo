# User Journeys

End-to-end journey maps for the Vex platform. Each journey documents what the user does, what the system does, and where the experience breaks down.

> **Source:** Derived from code analysis of both the original repos (`spire`, `vex-desktop`, `libvex-js`, `crypto-js`) and the current monorepo (`apps/spire`, `apps/desktop`, `apps/mobile`, `packages/libvex`, `packages/store`). Last updated March 2026.
>
> This document is the **story map backbone**. For the roadmap (what we're building now), see `roadmap.md`. For how the ops system works, see `README.md`.

---

## Journey Inventory

| # | Journey | Persona | Trigger | Status | Detail |
|---|---------|---------|---------|--------|--------|
| 1 | Registration | New user | "I want to try Vex" | Implemented (desktop, mobile) | [journeys-core.md](journeys-core.md#1-registration) |
| 2 | Login | Returning user | "I want to chat" | Implemented (desktop, mobile) | [journeys-core.md](journeys-core.md#2-login) |
| 3 | App Bootstrap | Authenticated user | After login | Implemented | [journeys-core.md](journeys-core.md#3-app-bootstrap) |
| 4 | Send Direct Message | Any user | "I want to message someone" | Implemented (desktop, mobile) | [journeys-core.md](journeys-core.md#4-send-direct-message) |
| 5 | Receive Direct Message | Any user | Someone sends them a message | Implemented (real-time) | [journeys-core.md](journeys-core.md#5-receive-direct-message) |
| 6 | Search & Add Contact | Any user | "I want to find someone" | Implemented (desktop, mobile) | [journeys-core.md](journeys-core.md#6-search--add-contact) |
| 7 | Verify Conversation | Security-conscious user | "Is this really them?" | Implemented (desktop) | [journeys-features.md](journeys-features.md#7-verify-conversation) |
| 8 | Create Server | Group organiser | "I want a group space" | Implemented (desktop) | [journeys-features.md](journeys-features.md#8-create-server) |
| 9 | Join Server via Invite | Invited user | Receives invite link | Implemented | [journeys-features.md](journeys-features.md#9-join-server-via-invite) |
| 10 | Send Group Message | Server member | "I want to post in a channel" | Implemented (desktop) | [journeys-features.md](journeys-features.md#10-send-group-message) |
| 11 | Manage Server & Channels | Server admin | "I need to organise my server" | Partial | [journeys-features.md](journeys-features.md#11-manage-server--channels) |
| 12 | Share a File | Any user | "I want to send a file" | Implemented (desktop) | [journeys-features.md](journeys-features.md#12-share-a-file) |
| 13 | Set Avatar | Any user | "I want a profile picture" | Implemented (desktop) | [journeys-features.md](journeys-features.md#13-set-avatar) |
| 14 | Manage Devices | Multi-device user | "I logged in on a new device" | Partial | [journeys-features.md](journeys-features.md#14-manage-devices) |
| 15 | Settings | Any user | "I want to change preferences" | Partial | [journeys-features.md](journeys-features.md#15-settings) |
| 16 | Logout | Any user | "I'm done for now" | Implemented | [journeys-features.md](journeys-features.md#16-logout) |

---

## Feature Coverage: Old → New

A complete comparison of what shipped in the old client versus what's available now.

### Fully Ported

- Registration with NaCl device key generation
- Login with JWT session
- WebSocket real-time message delivery
- E2E encrypted DM sending and receiving
- Server and channel CRUD
- Invite system with expiration
- Avatar upload and display
- Conversation fingerprint verification
- File upload/download + inline display (desktop)
- User search (desktop and mobile)
- Multi-device fan-out (sends to all recipient devices)
- Message forwarding to sender's own devices
- Group messaging (member list endpoint + ServerChannel fan-out)
- Local message persistence (IndexedDB — survives app restart)

### Partially Ported (gaps)

| Feature | What's Done | What's Missing |
|---------|-------------|----------------|
| Settings | Basic avatar + theme | No sound toggle, notifications, DM toggle, purge |
| Device management | SDK has `listDevices()` | No UI for device list, add, or remove |
| Online presence | `$onlineLists` atom exists | Not wired to any endpoint or UI |

### Not Ported

| Feature | Notes |
|---------|-------|
| Session healing | Old: auto-creates new session on HMAC failure. New: no recovery |
| Custom emoji | Old: upload/render per-server. New: not implemented |
| Sound effects | Old: 4 effects (unlock, lock, notify, error). New: none |
| Random username generation | Old: BIP39 mnemonic. New: not implemented |
| Real-time username availability | Old: checked on keystroke. New: deferred to submit |
| Message purge | Old: server-side + client-side clear. New: not implemented |
| Moderation (kick/ban) | Old: `client.moderation.kick()`. New: not implemented |
| Privacy policy update notification | Old: checked SHA against GitHub. New: not implemented |
| Auto-update | Old: Electron auto-updater. New: Tauri updater plugin wired but untested |

---

## Opportunities

All pain points and gaps identified from journey analysis are tracked as stories in `roadmap.md`. See that file for current status, priority, and release assignment.
