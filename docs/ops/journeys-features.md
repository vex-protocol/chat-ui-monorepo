# User Journeys: Features (7–16)

Verification, servers, groups, files, avatars, devices, settings, and logout. These build on the core journeys (1–6).

> For the journey inventory and feature coverage matrix, see [journeys.md](journeys.md). For journeys 1–6, see [journeys-core.md](journeys-core.md).

---

## 7. Verify Conversation

**Goal:** Confirm that the person you're talking to is really who they claim to be, not a man-in-the-middle.

This journey is central to the Vex brand. It's the "PRIVACY IS NOT A CRIME" feature — proving that encryption actually works.

### Stages

```
Notice indicator  →  Open panel  →  Compare fingerprint  →  Mark verified
"Unverified"        See hex codes    Phone/in-person check   "Verified"
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
| Delete channel | `client.channels.delete(channelID)` (power >= 50) | `client.deleteChannel(channelID)` |
| Delete server | `client.servers.delete(serverID)` (power >= 50) | `client.deleteServer(serverID)` |
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
