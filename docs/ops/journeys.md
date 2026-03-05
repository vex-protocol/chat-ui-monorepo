# User Journeys

End-to-end journey maps for the Vex platform. Each journey documents what the user does, what the system does, and where the experience breaks down.

> **Source:** Derived from code analysis of both the original repos (`spire`, `vex-desktop`, `libvex-js`, `crypto-js`) and the current monorepo (`apps/spire`, `apps/desktop`, `apps/mobile`, `packages/libvex`, `packages/store`). Last updated March 2026.
>
> This document is the **story map backbone**. For the roadmap (what we're building now), see `roadmap.md`. For how the ops system works, see `README.md`.

---

## Journey Inventory

| # | Journey | Persona | Trigger | Status |
|---|---------|---------|---------|--------|
| 1 | [Registration](#1-registration) | New user | "I want to try Vex" | Implemented (desktop, mobile) |
| 2 | [Login](#2-login) | Returning user | "I want to chat" | Implemented (desktop, mobile) |
| 3 | [App Bootstrap](#3-app-bootstrap) | Authenticated user | After login | Implemented |
| 4 | [Send Direct Message](#4-send-direct-message) | Any user | "I want to message someone" | Implemented (desktop, mobile) |
| 5 | [Receive Direct Message](#5-receive-direct-message) | Any user | Someone sends them a message | Implemented (real-time) |
| 6 | [Search & Add Contact](#6-search--add-contact) | Any user | "I want to find someone" | Implemented (desktop, mobile) |
| 7 | [Verify Conversation](#7-verify-conversation) | Security-conscious user | "Is this really them?" | Implemented (desktop) |
| 8 | [Create Server](#8-create-server) | Group organiser | "I want a group space" | Implemented (desktop) |
| 9 | [Join Server via Invite](#9-join-server-via-invite) | Invited user | Receives invite link | Implemented |
| 10 | [Send Group Message](#10-send-group-message) | Server member | "I want to post in a channel" | Partial (backend done, UI incomplete) |
| 11 | [Manage Server & Channels](#11-manage-server--channels) | Server admin | "I need to organise my server" | Partial |
| 12 | [Share a File](#12-share-a-file) | Any user | "I want to send a file" | Partial (backend done, UI not wired) |
| 13 | [Set Avatar](#13-set-avatar) | Any user | "I want a profile picture" | Implemented (desktop) |
| 14 | [Manage Devices](#14-manage-devices) | Multi-device user | "I logged in on a new device" | Partial |
| 15 | [Settings](#15-settings) | Any user | "I want to change preferences" | Partial |
| 16 | [Logout](#16-logout) | Any user | "I'm done for now" | Implemented |

---

## 1. Registration

**Goal:** Create a Vex account and device, ready to send encrypted messages.

**Why this is complex:** Unlike most apps, registration generates cryptographic keys on the user's device. The server never sees the private key. The userID itself is derived from a cryptographic signature, not server-assigned. This is the foundation of the "no surveillance by design" guarantee.

### Stages

```
Trigger          →  Key Generation  →  Server Handshake  →  Account Ready
"I want to try"     (invisible)        (token + sign)       "I can chat"
```

### Flow

| Stage | User Action | System Action | Emotional State |
|-------|-------------|---------------|-----------------|
| **Trigger** | Clicks "Register" | Shows registration form | Curious |
| **Username** | Types username (3–19 chars) | Old client: real-time availability check via `users.retrieve()`. New client: validates format only, server rejects duplicates on submit | Exploring, impatient if taken |
| **Password** | Types password + confirmation | Validates match and minimum length | Routine |
| **Key generation** | Invisible (no user action) | Generates Ed25519 signing key pair + X25519 pre-key pair locally. Private key stored on device, never transmitted | Unaware (good) |
| **Token exchange** | Invisible | `GET /token/register` → receives UUID token. Client NaCl-signs the token bytes with the new device key | Unaware |
| **Submit** | Clicks "Chat" / "Register" | `POST /register` with signed payload. Server verifies signature, derives userID from token UUID, hashes password with argon2id (new) or PBKDF2 (old), creates user + device + pre-key records | Waiting (loading spinner) |
| **Auto-login** | Invisible | Immediately calls `POST /auth` or uses returned JWT. Saves device credentials to local storage | Unaware |
| **Ready** | Sees main app | Bootstraps state (see Journey 3) | Satisfied, ready to explore |

### Differences: Old vs New

| Aspect | Old (vex-desktop) | New (monorepo) |
|--------|-------------------|----------------|
| Username check | Real-time availability via HTTP as user types | Deferred to submit (server rejects 409) |
| Password hash | PBKDF2-SHA512, 1000 iterations | argon2id (memory-hard, brute-force resistant) |
| Key storage | Keyfile on disk (encrypted with optional password via NaCl secretbox) | localStorage (desktop), SecureStore (mobile, planned) |
| Random username | BIP39 mnemonic button | Not implemented |
| Sound effects | `unlockFX` on success, `errorFX` on failure | Not implemented |
| Pre-key submission | Included in registration payload | Same |
| OTK batch | Submitted immediately after registration (100 keys) | Submitted during bootstrap |

### Pain Points

- **No password strength validation.** New server accepts single-character passwords (story `auth-rate-limit` in roadmap tracks the auth rate-limit fix, but password policy itself is a design decision — the real security model is key-based).
- **Key storage on desktop.** localStorage is not encrypted at rest. Old client used an encrypted keyfile with optional password. Need to decide on Tauri keychain integration.
- **No username availability feedback.** New client doesn't tell you the name is taken until you submit. The old client checked in real-time.
- **No recovery path.** If you lose your device key, you lose your account. There is no "forgot password" because the server can't restore your identity — it's cryptographically bound to your device. This is by design, but users need to understand it.

### Opportunities

- Add real-time username availability check back (low effort, high UX impact)
- Implement encrypted keyfile export/import for device migration
- Show a one-time warning: "Your device key IS your identity. Back it up."

---

## 2. Login

**Goal:** Resume an existing session and reconnect to the real-time stream.

### Stages

```
Trigger          →  Credential Check  →  WebSocket Connect  →  Ready
"I want to chat"    (password verify)     (challenge-response)   "I'm back"
```

### Flow

| Stage | User Action | System Action | Emotional State |
|-------|-------------|---------------|-----------------|
| **Trigger** | Opens app or navigates to `/login` | Checks for existing JWT in cookie/storage. If valid, skips to bootstrap | Anticipation |
| **Credentials** | Types username + password | Sends `POST /auth`. Server verifies against stored argon2id hash. Returns JWT (7-day expiry) | Routine |
| **Device auth** | Invisible | If device key exists: server sends 32-byte NaCl challenge over WebSocket. Client signs with Ed25519 device key. Server verifies against stored public key | Unaware |
| **Ready** | Sees conversations | Bootstraps state (see Journey 3) | Satisfied |

### Differences: Old vs New

| Aspect | Old | New |
|--------|-----|-----|
| Auto-login | Checks cookie via `whoami()` on mount | Same pattern |
| Key rotation | If 470 error (key conflict): backs up old key, generates new, retries | `$keyReplaced` flag triggers re-registration prompt |
| Device connect | Separate `POST /device/:id/connect` → device JWT cookie | Challenge-response handshake built into WebSocket |
| Retry on failure | Auto-retry after 5 seconds on 502 | No auto-retry yet |

### Pain Points

- **No "forgot password" flow.** By design — the server can't reset your identity. But there's no UX for explaining this.
- **No auto-retry.** Old client retried on 502; new client shows error and stops.
- **No session expiry warning.** JWT expires after 7 days. User gets silently logged out.

---

## 3. App Bootstrap

**Goal:** Load all state so the UI is populated when the user sees the main screen.

This is invisible to the user but critical to perceived performance. The bootstrap sequence determines how long the user stares at a loading spinner.

### Waterfall (current monorepo — `packages/store/bootstrap.ts`)

```
1. Create VexClient         → $client.set(client)
2. Wire real-time events    → mail → $messages, serverChange → $servers
3. client.connect()         → WebSocket + challenge handshake
4. client.whoami()          → $user.set(user)
5. client.listServers()     → $servers.set(...)
6. For each server:
   └─ client.listChannels() → $channels.setKey(serverID, channels)
7. [MISSING] Fetch familiars
8. [MISSING] Fetch message history
9. [MISSING] Fetch permissions per server
```

### Waterfall (old vex-desktop — `ClientLauncher.tsx`)

```
1. client.connect()
2. client.me.user()           → setUser()
3. client.sessions.retrieve() → setSessions()
4. client.users.familiars()   → setFamiliars()
5. POST /deviceList           → addDevices()
6. For each familiar:
   └─ client.messages.retrieve(userID) → dmAddMany()
7. client.servers.retrieve()  → setServers()
8. For each server:
   ├─ client.channels.retrieve(serverID) → addChannels()
   └─ For each channel:
       └─ client.messages.retrieveGroup(channelID) → groupAddMany()
9. client.permissions.retrieve() → setPermissions()
10. setApp("initialLoad", false) → loading spinner gone
```

### Gap Analysis

The new bootstrap is missing:
- **Familiars list** — old client had `users.familiars()` returning all users you've exchanged messages with. New server has no equivalent endpoint.
- **DM history** — old client fetched per-user message history. New server deletes mail after fetch (relay model). History would need client-side persistence.
- **Permissions** — old client fetched all permissions to know which servers you're admin of. New bootstrap doesn't do this.
- **Online presence** — old client polled `channels.userList()` every 30 seconds. New `$onlineLists` atom exists but isn't wired.

### Pain Points

- Bootstrap is sequential (waterfall). Each server's channels are fetched one at a time. Could be parallelised with `Promise.all`.
- No loading progress indicator (just a spinner). Old client at least transitioned through a `/launch` route.
- If any step fails, the whole bootstrap may silently leave state incomplete.

---

## 4. Send Direct Message

**Goal:** Send an encrypted message to another user that only they can decrypt.

This is the core journey. Everything else exists to support it.

### Stages

```
Compose  →  Key Exchange (if first msg)  →  Encrypt  →  Send  →  Confirm
"Hey"       X3DH with recipient device       NaCl        WS       "Delivered"
```

### Flow

| Stage | User Action | System Action | Emotional State |
|-------|-------------|---------------|-----------------|
| **Navigate** | Clicks on a conversation or searches for user | Loads thread from `$messages[userID]` | Intentional |
| **Compose** | Types message, presses Enter | — | Focused |
| **Resolve device** | Invisible | `client.listDevices(targetUserID)` → picks first device | Unaware |
| **Key exchange** | Invisible (first message only) | Fetches recipient's key bundle (`POST /device/:id/keyBundle`). Performs X3DH: DH(identity, preKey) + DH(ephemeral, identity) + DH(ephemeral, preKey) [+ DH(ephemeral, OTK)]. Derives shared secret via KDF. OTK consumed server-side | Unaware |
| **Encrypt** | Invisible | `nacl.secretbox(plaintext, nonce, sessionKey)`. Builds mail payload with cipher, nonce, header | Unaware |
| **Send** | Invisible | `POST /mail` or WebSocket resource message. Server stores ciphertext, notifies recipient if online | Brief wait |
| **Confirm** | Message appears in thread | Success response from server. Message added to `$messages` | Satisfied |

### Error Paths

| Error | Old Client | New Client |
|-------|------------|------------|
| Recipient has no devices | Error message in chat | `sendError = 'Recipient has no registered devices.'` |
| Encryption failure | Message marked as failed (red icon) | Error string displayed above input |
| Network error | Toast notification | `catch(err) → sendError = err.message` |
| Session mismatch (HMAC fail) | Auto-heals: creates new session, sends "RETRY_REQUEST" | Not implemented — would silently fail |

### Differences: Old vs New

| Aspect | Old | New |
|--------|-----|-----|
| Multi-device delivery | Sends to ALL devices of recipient (fan-out) + forwards to sender's other devices | Sends to first device only |
| Session management | Full double-ratchet with HMAC verification, auto-healing, and DB-persisted sessions | Each message uses fresh ephemeral keys (no persistent sessions) |
| Message forwarding | Forwarded to sender's other devices so they see their own sent messages | Not implemented |
| Optimistic UI | Message added to outbox immediately, removed on confirm | Message only appears after server confirms |
| File embedding | `{{name:fileID:key:mimeType}}` syntax in message body | Not implemented in UI |
| Sound | `notifyFX` on send | None |

### Pain Points

- **Single-device delivery.** New client only sends to `devices[0]`. If the recipient has two devices, one never gets the message. This is a fundamental regression from the old client (story `multi-device-fanout` in roadmap).
- **No message forwarding.** Sender's other devices don't see messages they sent from this device (tracked in `multi-device-fanout`).
- **No optimistic UI.** Message doesn't appear until server confirms, making the app feel slow.
- **No retry on failure.** Old client could auto-heal broken sessions. New client just shows an error.

---

## 5. Receive Direct Message

**Goal:** See incoming messages in real-time without manual refresh.

### Flow

| Stage | System Action | User Experience |
|-------|---------------|-----------------|
| **WebSocket push** | Server receives mail → looks up recipient device in connection manager → sends `{ resource: 'mail', ...payload }` over WS | Instant |
| **Decrypt** | `SessionManager.decrypt()` reconstructs shared secret from mail header, decrypts ciphertext | Invisible |
| **Store update** | `$messages.setKey(authorID, [...prev, decryptedMail])` | Message appears in thread |
| **Notification** | Desktop: Tauri notification plugin. Mobile: `@notifee/react-native` with sound + deep-link data | OS notification if app is backgrounded |

### Differences: Old vs New

| Aspect | Old | New |
|--------|-----|-----|
| Delivery | WS push + polling `POST /device/:id/mail` as backup | WS push + fetchInbox on route mount (not in bootstrap) |
| Mail deletion | Server deletes mail after fetch (relay model) | Same — server saves mail to DB AND pushes via WS. Mail persists in DB until client calls `fetchInbox()`, which fetches and deletes in a transaction. Online clients get messages via WS immediately but must still call fetchInbox to clear the server-side copy |
| Notification | Electron `new Notification()`, respects sound/mentions settings | Tauri notification (desktop), notifee (mobile) with deep-link to conversation |
| History | Messages persisted in local SQLite, encrypted at rest | Messages only in memory (nanostores). Lost on app restart |
| Session receipt | Client sends WS `receipt` message with nonce → server deletes mail | No explicit receipt. Mail remains in DB until `fetchInbox()` is called. WS push is a delivery shortcut, not a deletion trigger. This means mail for online clients accumulates in the DB — a gap in the relay model |

### Pain Points

- **No persistent message history.** Close the app, lose all messages. The old client had local SQLite with at-rest encryption. This is the single biggest UX regression (story `message-persistence` in roadmap).
- **No offline queue.** If the recipient is offline when the message is sent, the server stores it. The new client calls `fetchInbox()` on individual route mount (Messaging.svelte onMount, ServerChannel.svelte onMount) — but NOT during bootstrap. If the user opens the app and doesn't navigate to a conversation, missed messages sit in the server DB uncollected.
- **No read receipts.** Neither old nor new. By privacy design — read receipts reveal when you're online.

---

## 6. Search & Add Contact

**Goal:** Find another Vex user and start a conversation.

### Flow

| Stage | User Action | System Action |
|-------|-------------|---------------|
| **Search** | Types username in search bar | Desktop: navigates to `/messaging/:userID` directly (must know ID). Mobile: `client.searchUsers(query)` with 300ms debounce → shows results |
| **Select** | Clicks on result | Navigates to DM screen for that user |
| **First message** | Types and sends | Triggers X3DH key exchange (Journey 4) |

### Differences: Old vs New

| Aspect | Old | New |
|--------|-----|-----|
| Search | `client.users.retrieve(username)` with real-time green checkmark | Desktop: no search UI (navigate by ID). Mobile: `searchUsers` with debounced results |
| Familiar list | `client.users.familiars()` returns all past contacts | `$familiars` atom exists but not populated from server |
| Contact management | No explicit "add friend" — sessions auto-created on first message | Same implicit model |

### Pain Points

- **Desktop has no user search UI.** You need to know someone's userID to message them. The old client had an inline search bar (story `desktop-search` in roadmap).
- **No familiar list on new server.** The old server had a familiars endpoint. New server doesn't track who you've messaged (privacy-positive but UX-negative). The `$familiars` atom exists but is populated client-side from incoming messages, not from a server endpoint.
- **No contact list.** Neither old nor new has an explicit friend/contact system. You can only see people you've recently messaged.

---

## 7. Verify Conversation

**Goal:** Confirm that the person you're talking to is really who they claim to be, not a man-in-the-middle.

This journey is central to the Vex brand. It's the "PRIVACY IS NOT A CRIME" feature — proving that encryption actually works.

### Stages

```
Notice indicator  →  Open panel  →  Compare fingerprint  →  Mark verified
"🟡 Unverified"     See hex codes    Phone/in-person check   "🟢 Verified"
```

### Flow

| Stage | User Action | System Action | Emotional State |
|-------|-------------|---------------|-----------------|
| **Notice** | Sees yellow/unverified indicator in header | Fetches recipient's signKey via `listDevices()` → `fetchKeyBundle()` | Curious / cautious |
| **Open** | Clicks shield icon | Computes fingerprint: SHA-256 of sorted concatenation of both Ed25519 public keys, formatted as 4-char hex blocks | Engaged |
| **Compare** | Calls or meets the other person, reads fingerprint aloud | Both parties see the same string (order-independent) | Trust-building, deliberate |
| **Verify** | Clicks "Mark as verified" | Adds signKey to `$verifiedKeys` (localStorage-persisted Set). Shield turns green | Secure, satisfied |
| **Unverify** | Clicks "Mark as unverified" (if re-checking) | Removes signKey from `$verifiedKeys` | Cautious |

### Differences: Old vs New

| Aspect | Old | New |
|--------|-----|-----|
| Format | 12-word BIP39 mnemonic ("safety words") via `xMnemonic(xKDF(fingerprint))` | SHA-256 hex blocks (e.g., `a3f2 1bc4 ...`) |
| Scope | Per-session (each encryption session has its own mnemonic) | Per-device signKey (one fingerprint per recipient device) |
| Storage | Session.verified flag in local SQLite | `$verifiedKeys` Set in localStorage |
| UI | Dedicated `/verify/:sessionID` route with list of all sessions | Inline panel in DM header with toggle button |
| Warning | "This user has unverified sessions" banner + "DON'T use vex to communicate the words" | "Compare this fingerprint with the other party via a trusted channel (phone, in person)" |

### Pain Points

- **Hex is less human-friendly than safety words.** The old BIP39 mnemonic ("correct horse battery staple") was easier to read aloud over the phone than "a3f2 1bc4 9e7d". Consider switching back to mnemonic format.
- **No per-device granularity in new client.** If a user has multiple devices, the fingerprint only covers one signKey. Old client showed each session separately.
- **No automatic re-verification prompt.** If the recipient's device changes (key rotation), the fingerprint changes silently. Should show a warning: "This person's key has changed."

---

## 8. Create Server

**Goal:** Create a group space with channels for team or community chat.

### Flow

| Stage | User Action | System Action |
|-------|-------------|---------------|
| **Trigger** | Clicks "+" or "Create Server" | Shows creation form |
| **Name** | Types server name | — |
| **Submit** | Clicks create | `client.createServer(name, icon)`. Server creates server record, grants creator admin permission (power level 100), auto-creates "general" channel |
| **Ready** | Sees new server in sidebar | Fetches channels, navigates to general channel |

### Differences: Old vs New

| Aspect | Old | New |
|--------|-----|-----|
| Server name | base64-encoded in URL path (`POST /server/:name`) | JSON body (`POST /server`) |
| Auto-channel | "general" channel auto-created | Same |
| Icon | Not implemented | `icon` field in schema but no upload UI |
| Navigation | Redirects to first channel | Navigates to `/server/:id/:channelID` |

---

## 9. Join Server via Invite

**Goal:** Accept an invite link and gain access to a server's channels.

### Stages

```
Receive link  →  Open app  →  Validate invite  →  Join  →  See channels
```

### Flow

| Stage | User Action | System Action |
|-------|-------------|---------------|
| **Receive** | Gets `vex://invite/:id` link (or web URL) | — |
| **Open** | Clicks link or pastes in app | Desktop: deep-link handler parses `vex://invite/:id`, navigates to `/invite/:id`. Mobile: not yet implemented |
| **Preview** | Sees server name + expiration | `client.getInvite(inviteID)` — no auth required |
| **Join** | Clicks "Join" | `client.joinServerViaInvite(inviteID)`. Server validates invite, checks expiration, creates permission with default member power (1) |
| **Ready** | Sees server and channels | Fetches channels, redirected to general channel |

### Pain Points

- **Race condition.** `POST /invite/:id/join` is not transactional (story `invite-atomicity` in roadmap). Concurrent joins can create duplicate permissions.
- **No deep-link on mobile.** Mobile app doesn't handle `vex://` URLs yet.
- **No invite preview UI.** Both old and new desktop clients auto-join without showing the server name first.

---

## 10. Send Group Message

**Goal:** Post a message to a server channel that all members can read.

### Flow

| Stage | User Action | System Action |
|-------|-------------|---------------|
| **Navigate** | Selects a channel in a server | Loads `$groupMessages[channelID]` |
| **Compose** | Types message | — |
| **Send** | Presses Enter | Should: encrypt for each member's device, send via `client.sendMail(content, deviceID, userID, { group: channelID })` |

### Implementation Status

| Component | Old | New |
|-----------|-----|-----|
| Backend | `POST /mail` with `group` field | Same — `saveMail()` stores group channelID |
| Client SDK | `client.messages.group(channelID, message)` — fans out to ALL devices of ALL channel members | `client.sendMail(..., { group: channelID })` — sends to one device only |
| Desktop UI | Fully working (sends + renders in `ServerPane.tsx`) | `ServerChannel.svelte` shows `console.warn('group messaging not yet wired')` |
| Mobile UI | N/A | `ChannelScreen.tsx` has send function but marked as incomplete |
| Member list | `POST /userList/:channelID` returns all server members | No equivalent endpoint. Backend needs `GET /server/:id/members` |

### Pain Points

- **Not functional in new client.** This is the biggest feature gap. Users can see channels but can't post (story `group-messaging-ui` in roadmap).
- **Fan-out complexity.** Group messages must be encrypted separately for every device of every member. The old client did this (`Promise.allSettled` over all devices). The new client sends to one device — completely broken for groups. Depends on `multi-device-fanout` (multi-device fan-out).
- **No member list endpoint.** Backend has `GET /server/:id/permissions` which returns permission objects (userID + power level), but no endpoint returning user profiles. Need a proper `GET /server/:id/members` that joins permissions with user profiles (tracked in `group-messaging-ui`).

---

## 11. Manage Server & Channels

**Goal:** Create channels, manage invites, remove members, configure the server.

### Implemented Actions

| Action | Old | New |
|--------|-----|-----|
| Create channel | `client.channels.create(name, serverID)` | `client.createChannel(serverID, name)` |
| Delete channel | `client.channels.delete(channelID)` (power ≥ 50) | `client.deleteChannel(channelID)` |
| Delete server | `client.servers.delete(serverID)` (power ≥ 50) | `client.deleteServer(serverID)` |
| Leave server | `client.servers.leave(serverID)` | Not implemented |
| Kick user | `client.moderation.kick(userID, serverID)` | Not implemented |
| Create invite | `client.invites.create(serverID, "1h")` | `client.createInvite(serverID, expiration)` |
| List invites | `client.invites.retrieve(serverID)` | `client.listInvites(serverID)` |
| Delete invite | N/A | `client.deleteInvite(serverID, inviteID)` |

### Missing from New

- Leave server (SDK method exists but no UI)
- Kick/ban users (no SDK method, no backend endpoint)
- Permission management UI (power levels exist in DB but no UI to change them)
- Server settings page (name, icon editing)
- Channel ordering/categories
- Online member list (old client polled every 30 seconds)

---

## 12. Share a File

**Goal:** Send a file (image, document, etc.) to another user or channel.

### Flow

| Stage | Old Client | New Client |
|-------|------------|------------|
| **Pick file** | Drag into chat or paste image. File picker via ChatInput | Not implemented in UI |
| **Validate** | Max 20MB files, 5MB avatars | Backend: max 25MB |
| **Upload** | `client.files.create(buffer)` → returns `{ fileID, key }` | `client.uploadFile(data, contentType, nonce)` → returns `{ fileID, nonce }` |
| **Send reference** | Embeds `{{name:fileID:key:mimeType}}` in message body | No reference format defined |
| **Render** | `MessageBox` parses `{{...}}` syntax, renders images inline, files as download links | Not implemented |
| **Download** | `GET /file/:fileID` + client-side decryption with key | `client.downloadFile(fileID)` exists in SDK |
| **Progress** | Upload progress shown: "XX% Uploaded: YYB/ZZB at Aaa/second" | No progress tracking |

### Pain Points

- **No file UI in new client.** Backend and SDK are done. ChatInput needs a file picker, MessageBox needs inline rendering (story `file-attachments` in roadmap, P1).
- **No encryption format defined.** Old client embedded the encryption key in the message. New client has a `nonce` field but no defined protocol for sharing the decryption key with the recipient.
- **No file size feedback.** Old client showed real-time upload progress. New client has no progress callback.

---

## 13. Set Avatar

**Goal:** Upload a profile picture.

### Flow

| Stage | User Action | System Action |
|-------|-------------|---------------|
| **Open settings** | Navigates to settings | Shows current avatar (or default) |
| **Pick image** | Clicks avatar area or upload button | File picker opens (image types only) |
| **Upload** | Selects file | `client.setAvatar(data, mimeType)` → `POST /avatar/:userID`. Old client validated type (JPEG, PNG, GIF, APNG, AVIF). New validates via content-type header |
| **Confirm** | Sees new avatar | `$avatarHash` updated to bust cache. All avatar `<img>` tags reload |

### Differences: Old vs New

| Aspect | Old | New |
|--------|-----|-----|
| Max size | 5MB | 5MB (old) / no limit checked (new — needs fix) |
| Type check | Magic byte detection (JPEG, PNG, GIF, APNG, AVIF, SVG) | Content-type header only (no magic byte) |
| Cache busting | `avatarHash` in Redux | `$avatarHash` in nanostores |
| Desktop UI | Click avatar to upload | Settings page with avatar + file picker |
| Mobile UI | N/A | Not implemented |

---

## 14. Manage Devices

**Goal:** See all devices registered to your account, add new ones, remove compromised ones.

### Old Client

1. Navigate to any conversation → User Devices
2. See list: device name, last login, sign key
3. Click "Delete" on a device → confirmation modal → `client.devices.delete(deviceID)`
4. Prevents deleting last device ("You can't delete your last device")

### New Client

- `client.listDevices(userID)` exists in SDK
- No UI for device list or management
- No "add device" flow (registration creates one device, multi-device add not exposed)
- Device count shown in Settings (desktop) as truncated hex of device key seed — but no management

---

## 15. Settings

**Goal:** Configure app preferences.

### Old Client Settings

| Setting | Storage | Effect |
|---------|---------|--------|
| Theme color | DataStore (localStorage) | Changes CSS variables |
| Notifications | DataStore | Enables/disables OS notifications |
| Mention-only notifications | DataStore | Only notify on @mention |
| Sound effects | DataStore | Enables/disables `unlockFX`, `lockFX`, `notifyFX`, `errorFX` |
| Direct messages toggle | DataStore | Hides DM section entirely |
| Message history purge | Server-side | Calls `client.messages.purge()`, clears all Redux state |

### New Client Settings (Desktop)

| Setting | Storage | Effect |
|---------|---------|--------|
| Avatar upload | Server | POST /avatar/:userID |
| Server URL | localStorage | Changes API endpoint |
| Theme (light/dark) | Not persisted | CSS class toggle |
| Update check | — | Tauri updater plugin |
| Device fingerprint display | — | Shows truncated hex of device key |
| Test notification | — | Fires a sample notifee notification (mobile only) |

### Missing

- Sound toggle (sounds not implemented)
- Notification preferences (no granular control)
- Message purge (no local history to purge)
- Account deletion
- Password change
- Export/import device keys

---

## 16. Logout

**Goal:** End the session securely.

### Flow

| Stage | Old Client | New Client |
|-------|------------|------------|
| **Trigger** | Click logout in menu | Click logout in UserMenu |
| **Server** | `POST /goodbye` → server sets expired JWT cookie | `client.logout()` → same |
| **Client cleanup** | Closes WebSocket, resets ALL Redux slices (12 reset calls), optionally clears keyfile | Navigates to `/login` |
| **Sound** | `lockFX.play()` | None |
| **Redirect** | `/` with `?logout=true` | `/login` |

### Pain Points

- **New client doesn't clear state.** Nanostores atoms retain values in memory. `clearCredentials()` only removes localStorage items. A different user logging in could momentarily see the previous user's conversations (story `logout-cleanup` in roadmap).
- **No key clearing option.** Old client had `?clear=off` to preserve keys. New client doesn't offer the choice.

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
- File upload/download (backend only)

### Partially Ported (gaps)

| Feature | What's Done | What's Missing |
|---------|-------------|----------------|
| Group messaging | Backend stores + delivers group mail | UI send disabled, no member list endpoint, no fan-out to all devices |
| File sharing | Upload/download API + SDK methods | No chat UI (picker, inline render, progress), no encryption protocol |
| User search | Mobile has search UI, SDK has `searchUsers()` | Desktop has no search UI |
| Settings | Basic avatar + theme | No sound toggle, notifications, DM toggle, purge |
| Device management | SDK has `listDevices()` | No UI for device list, add, or remove |
| Online presence | `$onlineLists` atom exists | Not wired to any endpoint or UI |

### Not Ported

| Feature | Notes |
|---------|-------|
| Message forwarding to own devices | Sender's other devices don't see sent messages |
| Local message history | Old: SQLite with NaCl at-rest encryption. New: memory only |
| Session healing | Old: auto-creates new session on HMAC failure. New: no recovery |
| Multi-device fan-out | Old: sends to ALL recipient devices. New: first device only |
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
