# ADR-007: Device-Key Auto-Login (Passwordless Session Bootstrap)

**Status:** Proposed
**Date:** 2026-04-07
**Deciders:** @dgill

---

## Context

Vex Chat needs auto-login — when a user reopens the app on a device they've
previously registered, they should be connected automatically without re-entering
their password.

The app persists `StoredCredentials` in the OS keychain (Tauri) or secure store
(Expo):

```typescript
interface StoredCredentials {
    username: string;
    deviceID: string;
    deviceKey: string;    // hex Ed25519 private signing key
    token?: string;
}
```

Currently, auto-login calls `client.connect()` which calls `whoami()`, which
requires a valid auth cookie. But on a fresh app launch, there is no auth cookie
— the webview/RN process starts with an empty cookie jar. The flow fails
silently and the user must log in manually every time.

### Design constraints

Vex's identity model is **device-key-bound**:

> *"Identity is device-key-bound — users are identified by their NaCl Ed25519
> signing key, not a username/email alone."*
> — vex-overview.md

> *"Device (NaCl Ed25519 signing key pair — generated on device, private key
> never leaves client)"*
> — Key hierarchy

The private signing key is the strongest credential the system has. It is
already stored in the OS keychain. Any auto-login mechanism should use this
existing credential rather than introducing weaker ones.

---

## Options Evaluated

### Option 1: Store and restore the JWT token

Save the JWT from `login()` to the keystore. On auto-login, inject it into
axios headers before calling `connect()`.

| Criteria | Assessment |
|----------|-----------|
| **Privacy** | Stores a bearer token that grants full account access. If the keystore is compromised, the attacker can impersonate the user until expiry (7 days). |
| **Security** | JWT is a shared secret between client and server. It can be replayed from any device. Does not prove possession of the device key. |
| **Alignment with identity model** | Poor. Vex's identity is device-key-bound, but JWT auth bypasses that — any holder of the JWT is authenticated regardless of which device they're on. |
| **Platform compatibility** | Works everywhere. No server changes. |
| **Expiry** | JWT expires in 7 days. After that, user must log in manually. |

**Verdict:** Expedient but contradicts the privacy-first, device-key-bound
identity model. The JWT is a portable credential that is not bound to the device.

### Option 2: Store username + password in the keystore

Persist the plaintext password in the OS secure store. Auto-login calls
`login(username, password)` → `connect()`.

| Criteria | Assessment |
|----------|-----------|
| **Privacy** | Stores the user's plaintext password on-device. Even in the OS keychain, this is a high-value target. |
| **Security** | Password is a reusable, human-chosen secret. If the keystore is breached, the attacker can register new devices, change the password, and take over the account permanently. |
| **Alignment with identity model** | Contradicts it entirely. Vex's model says identity is the device key, not the password. Storing the password elevates it to a persistent credential. |
| **Platform compatibility** | Works everywhere. No server changes. |
| **User trust** | Users choosing a privacy-first platform expect their password is not persisted anywhere. |

**Verdict:** Rejected. Storing passwords contradicts "no surveillance by design"
and the device-key identity model.

### Option 3: Device-key challenge-response (recommended)

The device proves it holds the private signing key by signing a server-issued
nonce. No passwords, no JWTs, no shared secrets.

| Criteria | Assessment |
|----------|-----------|
| **Privacy** | No new secrets stored. The device key is already in the OS keychain from registration. Nothing additional to leak. |
| **Security** | Challenge-response proves possession of the private key. The nonce prevents replay. The signature is bound to one device — cannot be used from another. |
| **Alignment with identity model** | Perfect. This IS the identity model — device keys are the root of trust. |
| **Platform compatibility** | Works everywhere. Same crypto primitives already used for registration and WS auth. |
| **Server changes** | New HTTP endpoint on spire. |

**Verdict:** Recommended. Uses the existing identity model. No new credentials
to store, leak, or expire.

---

## Decision

Implement **Option 3: device-key challenge-response** for auto-login.

### Protocol

```
1. Client sends:  POST /auth/device
                  { deviceID, signKey }

2. Server:        - Looks up device by deviceID
                  - Verifies signKey matches stored device signKey
                  - Generates random 32-byte nonce
                  - Responds: { challenge: hex(nonce) }

3. Client:        - Signs the nonce with device private key
                  - Sends:  POST /auth/device/verify
                            { deviceID, challenge: hex(nonce), signed: hex(signature) }

4. Server:        - Verifies signature against stored device signKey
                  - Looks up device owner
                  - Issues JWT + sets auth cookie (same as password login)
                  - Responds: { user, token }

5. Client:        - Proceeds to connect() as normal
```

### Why two round-trips

The challenge must come from the server (not the client) to prevent replay
attacks. If the client could choose what to sign, an attacker who intercepted
one signed payload could replay it indefinitely. The server-generated nonce
ensures freshness.

This is the same pattern used by:
- SSH public key authentication
- WebAuthn/FIDO2 (passkeys)
- The existing `connect()` flow in Client.ts (signs a connect token)
- The existing WS challenge in ClientManager (signs a challenge ID)

### Changes Required

**spire (server):**
- New route: `POST /auth/device` — accepts `{ deviceID, signKey }`, returns `{ challenge }`
- New route: `POST /auth/device/verify` — accepts `{ deviceID, challenge, signed }`, verifies signature, returns JWT + cookie
- Challenge stored in-memory with TTL (same pattern as action tokens)
- No new database tables — uses existing `devices` table

**libvex-js (client):**
- New method: `Client.loginWithDeviceKey()` — performs the two-step handshake
- Called by auto-login path when stored credentials have a deviceKey but no valid session

**vex-chat store (bootstrap.ts):**
- `autoLogin()` calls `client.loginWithDeviceKey()` → `connect()` instead of bare `connect()`

**No changes to:**
- StoredCredentials type (deviceKey is already there)
- Keystore implementations (already persist deviceKey)
- Registration flow
- Password login flow (remains available for first-time login)

### Credential lifecycle

```
Registration:
  password + username → server creates user + device
  client generates Ed25519 keypair → deviceKey saved to OS keychain
  server stores device.signKey (public)

Subsequent launches (auto-login):
  OS keychain → { deviceID, deviceKey }
  deviceKey signs server challenge → JWT issued
  no password involved

Password login (new device or keychain cleared):
  user enters password → server verifies → JWT issued
  new device registered → deviceKey saved to OS keychain
```

---

## Consequences

### Positive

- **Zero additional secrets** — no passwords or tokens stored beyond what registration already saves
- **Device-bound** — the signing key cannot be extracted and used elsewhere (OS keychain protection)
- **No expiry concerns** — device keys don't expire (unlike 7-day JWTs)
- **Consistent with identity model** — the device key IS the identity, and now it's also the login credential
- **Revocable** — deleting a device on the server invalidates its auto-login (same as SSH `authorized_keys`)
- **Works offline-first** — the challenge-response needs only two HTTP calls, no cookie jar state

### Negative

- **Two HTTP round-trips** — slightly slower than restoring a cached JWT (but only happens once per app launch)
- **Server-side challenge storage** — in-memory with TTL, same as existing action tokens (minimal overhead)
- **New code** — two new endpoints on spire, one new method on Client

### Migration

- Existing `StoredCredentials` already contains `deviceKey` — no migration needed
- Password login continues to work for first-time setup on new devices
- Auto-login transparently upgrades: if deviceKey is present, use challenge-response; if not, show login screen

---

## References

- [SSH Public Key Authentication](https://www.ssh.com/academy/ssh/public-key-authentication) — same challenge-response pattern
- [WebAuthn/FIDO2](https://webauthn.guide/) — device-bound credentials, challenge-response
- ADR-006: Post-Connection WebSocket Authentication — established the post-connection auth pattern
- `vex-overview.md` — "Identity is device-key-bound"
- `Client.ts` connect flow — already signs connect tokens with device key
- `ClientManager.ts` — already verifies device key signatures in WS challenge
