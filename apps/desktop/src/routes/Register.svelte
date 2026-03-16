<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { encodeHex } from '@vex-chat/crypto'
  import { VexClient } from '@vex-chat/libvex'
  import { bootstrap, user as userAtom } from '../lib/store/index.js'
  import { getServerUrl, saveCredentials } from '../lib/config.js'
  import { playUnlock, playError } from '../lib/sounds.js'

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
      const SERVER_URL = getServerUrl()

      const result = await VexClient.registerAndLogin(SERVER_URL, username, password, 'Desktop')

      if (!result.ok) {
        error = result.error.message || `Registration failed (${result.error.code})`
        playError()
        loading = false
        return
      }

      // Save device credentials for future logins
      saveCredentials({
        username,
        deviceID: result.deviceID,
        deviceKey: encodeHex(result.signKeyPair.secretKey),
        preKey: encodeHex(result.preKeyPair.secretKey),
      })

      // Bootstrap the store with the JWT from registration
      await bootstrap(SERVER_URL, result.deviceID, result.signKeyPair.secretKey, result.token, result.preKeyPair.secretKey)

      if (userAtom.get()) {
        playUnlock()
        push('/settings')
      } else {
        error = 'Registration succeeded but could not connect to server'
        playError()
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
