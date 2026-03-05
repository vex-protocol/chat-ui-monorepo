<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { parse as uuidParse } from 'uuid'
  import { generateSignKeyPair, signMessage, encodeHex } from '@vex-chat/crypto'
  import { bootstrap, user as userAtom } from '../lib/store/index.js'

  const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:16777'

  let username = $state('')
  let password = $state('')
  let confirm = $state('')
  let error = $state('')
  let loading = $state(false)

  async function handleRegister(e: SubmitEvent) {
    e.preventDefault()
    if (password !== confirm) { error = 'Passwords do not match'; return }

    loading = true
    error = ''

    try {
      // 1. Generate Ed25519 device signing key pair
      const signKeyPair = generateSignKeyPair()
      const preKeyPair = generateSignKeyPair()

      // 2. Fetch an open registration token (requires OPEN_REGISTRATION=true on spire)
      const tokenRes = await fetch(`${SERVER_URL}/token/open/register`)
      if (!tokenRes.ok) {
        error = tokenRes.status === 404
          ? 'Registration is invite-only on this server.'
          : `Failed to get registration token (${tokenRes.status})`
        loading = false
        return
      }
      const { key: tokenKey } = await tokenRes.json() as { key: string }

      // 3. Sign the token UUID bytes with the device signing key (NaCl format: sig || msg)
      const tokenBytes = uuidParse(tokenKey) as Uint8Array
      const signed = signMessage(tokenBytes, signKeyPair.secretKey)

      // 4. Sign the preKey public key with the signing key
      const preKeySignature = signMessage(preKeyPair.publicKey, signKeyPair.secretKey)

      // 5. POST /register
      const regRes = await fetch(`${SERVER_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username,
          password,
          signKey: encodeHex(signKeyPair.publicKey),
          signed: encodeHex(signed),
          preKey: encodeHex(preKeyPair.publicKey),
          preKeySignature: encodeHex(preKeySignature),
          preKeyIndex: 0,
          deviceName: 'Desktop',
        }),
      })

      if (!regRes.ok) {
        const body = await regRes.json().catch(() => ({})) as { message?: string }
        error = body.message ?? `Registration failed (${regRes.status})`
        loading = false
        return
      }

      const regData = await regRes.json() as { token: string; userID: string; deviceID: string }

      // 6. Save device credentials to localStorage (upgraded to Tauri FS in vex-chat-tyu)
      // deviceID is the UUID assigned by spire (used for WS auth and API calls)
      localStorage.setItem('vex-device-id', regData.deviceID)
      localStorage.setItem('vex-device-key', encodeHex(signKeyPair.secretKey))
      localStorage.setItem('vex-prekey', encodeHex(preKeyPair.secretKey))
      localStorage.setItem('vex-username', username)

      // 7. Bootstrap the store with the JWT from registration response
      await bootstrap(SERVER_URL, regData.deviceID, signKeyPair.secretKey, regData.token, preKeyPair.secretKey)

      // Navigate into the app (no servers yet after fresh register)
      if (userAtom.get()) {
        push('/server/home/general')
      } else {
        error = 'Registration succeeded but could not connect to server'
        loading = false
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unexpected error'
      loading = false
    }
  }
</script>

<div class="auth-page">
  <div class="auth-card">
    <h1 class="auth-card__title">Create account</h1>
    <p class="auth-card__subtitle">Join Vex Chat</p>

    {#if error}
      <p class="auth-card__error">{error}</p>
    {/if}

    <form class="auth-form" onsubmit={handleRegister}>
      <div class="auth-form__field">
        <label for="username">Username</label>
        <input id="username" type="text" placeholder="choose a username" bind:value={username} disabled={loading} required minlength="3" maxlength="19" pattern="\w+" />
      </div>

      <div class="auth-form__field">
        <label for="password">Password</label>
        <input id="password" type="password" placeholder="••••••••" bind:value={password} disabled={loading} required />
      </div>

      <div class="auth-form__field">
        <label for="confirm">Confirm password</label>
        <input id="confirm" type="password" placeholder="••••••••" bind:value={confirm} disabled={loading} required />
      </div>

      <button class="auth-form__submit" type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>

    <p class="auth-card__footer">
      Already have an account?
      <button class="auth-card__link" onclick={() => push('/login')}>Sign in</button>
    </p>
  </div>
</div>

<style>
  .auth-page {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-primary);
  }

  .auth-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 32px;
    width: 360px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .auth-card__title { font-size: 22px; font-weight: 700; color: var(--text-primary); }
  .auth-card__subtitle { font-size: 13px; color: var(--text-secondary); margin-top: -10px; }

  .auth-card__error {
    background: color-mix(in srgb, var(--danger) 15%, transparent);
    color: var(--danger);
    border: 1px solid var(--danger);
    border-radius: 4px;
    padding: 8px 12px;
    font-size: 13px;
  }

  .auth-form { display: flex; flex-direction: column; gap: 14px; }

  .auth-form__field { display: flex; flex-direction: column; gap: 5px; }

  .auth-form__field label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .auth-form__submit {
    background: var(--accent);
    color: #fff;
    padding: 10px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    transition: opacity 0.15s;
    margin-top: 4px;
  }

  .auth-form__submit:hover:not(:disabled) { opacity: 0.9; }
  .auth-form__submit:disabled { opacity: 0.5; cursor: not-allowed; }

  .auth-card__footer { font-size: 13px; color: var(--text-secondary); text-align: center; }
  .auth-card__link { color: var(--accent); text-decoration: underline; font-size: 13px; }
</style>
