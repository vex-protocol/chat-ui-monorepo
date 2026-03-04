<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { decodeHex } from '@vex-chat/crypto'
  import { bootstrap, user as userAtom, servers as serversAtom } from '../lib/store/index.js'

  const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:16777'

  let username = $state('')
  let password = $state('')
  let error = $state('')
  let loading = $state(false)

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault()
    loading = true
    error = ''

    try {
      // 1. Load saved device credentials
      const savedUsername = localStorage.getItem('vex-username')
      const deviceKeyHex = localStorage.getItem('vex-device-key')
      const deviceIDHex = localStorage.getItem('vex-device-id')

      if (!deviceKeyHex || !deviceIDHex) {
        error = 'No device key found. Please register first.'
        loading = false
        return
      }

      if (savedUsername && savedUsername !== username) {
        error = 'Username does not match registered device.'
        loading = false
        return
      }

      // 2. POST /auth to get JWT (sets httpOnly cookie + returns token in body)
      const authRes = await fetch(`${SERVER_URL}/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })

      if (!authRes.ok) {
        const body = await authRes.json().catch(() => ({})) as { message?: string }
        error = body.message ?? 'Invalid username or password'
        loading = false
        return
      }

      const { token } = await authRes.json() as { token: string }

      // 3. Bootstrap store with device key + JWT
      const deviceKey = decodeHex(deviceKeyHex)
      await bootstrap(SERVER_URL, deviceIDHex, deviceKey, token)

      // Navigate into the app
      if (userAtom.get()) {
        const serverList = Object.values(serversAtom.get())
        if (serverList.length > 0) {
          push(`/server/${serverList[0]!.serverID}/general`)
        } else {
          push('/server/home/general')
        }
      } else {
        error = 'Could not verify credentials after login'
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
    <h1 class="auth-card__title">Welcome back</h1>
    <p class="auth-card__subtitle">Sign in to Vex Chat</p>

    {#if error}
      <p class="auth-card__error">{error}</p>
    {/if}

    <form class="auth-form" onsubmit={handleLogin}>
      <div class="auth-form__field">
        <label for="username">Username</label>
        <input
          id="username"
          type="text"
          autocomplete="username"
          placeholder="your username"
          bind:value={username}
          disabled={loading}
          required
        />
      </div>

      <div class="auth-form__field">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          autocomplete="current-password"
          placeholder="••••••••"
          bind:value={password}
          disabled={loading}
          required
        />
      </div>

      <button class="auth-form__submit" type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign in'}
      </button>
    </form>

    <p class="auth-card__footer">
      Don't have an account?
      <button class="auth-card__link" onclick={() => push('/register')}>Register</button>
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

  .auth-form__field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

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
