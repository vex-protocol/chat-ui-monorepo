<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { Client } from '@vex-chat/libvex'
  import { bootstrap, user as userAtom } from '../lib/store/index.js'
  import { getServerUrl } from '../lib/config.js'
  import { keyStore } from '../lib/keystore.js'
  import { playUnlock, playError } from '../lib/sounds.js'

  let username = $state('')
  let password = $state('')
  let confirm = $state('')
  let errors: Record<string, string> = $state({})
  let loading = $state(false)

  // ── Username availability check ────────────────────────────────────────────

  let usernameStatus: 'idle' | 'checking' | 'available' | 'taken' = $state('idle')
  let debounceTimer: ReturnType<typeof setTimeout> | undefined

  const USERNAME_RE = /^\w+$/
  const LEADING_TRAILING_RE = /^[-_]|[-_]$/

  function validateUsername(value: string): string | null {
    if (value.length < 3) return 'Username must be at least 3 characters'
    if (!USERNAME_RE.test(value)) return 'Username can only contain letters, numbers, hyphens, and underscores'
    if (LEADING_TRAILING_RE.test(value)) return 'Username cannot start or end with a hyphen or underscore'
    return null
  }

  // ── Debounced username availability check ────────────────────────────────────

  let prevUsername = ''

  function checkUsername(value: string): void {
    clearTimeout(debounceTimer)
    usernameStatus = 'idle'
    errors = { ...errors }
    delete errors.username

    if (!value) return

    const localError = validateUsername(value)
    if (localError) {
      if (value.length >= 3) errors = { ...errors, username: localError }
      return
    }

    usernameStatus = 'checking'
    debounceTimer = setTimeout(async () => {
      try {
        const taken = await Client.checkUsername(getServerUrl(), value)
        if (username !== value) return // stale
        usernameStatus = taken ? 'taken' : 'available'
        if (taken) errors = { ...errors, username: 'Username is already taken' }
      } catch {
        usernameStatus = 'idle'
      }
    }, 400)
  }

  // Only react to username changes, not errors/status changes
  $effect(() => {
    const value = username
    if (value !== prevUsername) {
      prevUsername = value
      // Use untrack to avoid re-triggering on errors/status writes
      checkUsername(value)
    }
  })

  // Clear field errors when user edits
  $effect(() => {
    void password
    delete errors.password
  })

  $effect(() => {
    void confirm
    delete errors.confirm
  })

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleRegister(e: SubmitEvent) {
    e.preventDefault()

    // Validate all fields
    const newErrors: Record<string, string> = {}
    const usernameError = validateUsername(username)
    if (!username) newErrors.username = 'Username is required'
    else if (usernameError) newErrors.username = usernameError
    else if (usernameStatus === 'taken') newErrors.username = 'Username is already taken'
    if (password.length < 8) newErrors.password = 'Password must be at least 8 characters'
    if (password !== confirm) newErrors.confirm = 'Passwords do not match'

    if (Object.keys(newErrors).length > 0) {
      errors = newErrors
      // Focus first error field
      const firstKey = Object.keys(newErrors)[0]!
      document.getElementById(firstKey)?.focus()
      return
    }

    loading = true
    errors = {}

    try {
      const SERVER_URL = getServerUrl()

      const privateKey = Client.generateSecretKey()
      const client = await Client.create(privateKey, { host: SERVER_URL, unsafeHttp: SERVER_URL.startsWith('http:') })
      const [user, regErr] = await client.register(username, password)

      if (regErr || !user) {
        errors = { form: regErr?.message || 'Registration failed' }
        playError()
        loading = false
        return
      }

      // Persist hex device key via KeyStore
      await keyStore.save({
        username,
        deviceID: client.me.device().deviceID,
        deviceKey: privateKey,
      })

      // Bootstrap the store
      await bootstrap(privateKey, { host: SERVER_URL, unsafeHttp: SERVER_URL.startsWith('http:') })

      if (userAtom.get()) {
        playUnlock()
        push('/home')
      } else {
        errors = { form: 'Registration succeeded but could not connect to server' }
        playError()
        loading = false
      }
    } catch (err) {
      errors = { form: err instanceof Error ? err.message : 'Unexpected error' }
      loading = false
    }
  }
</script>

<div class="auth-page">
  <div class="auth-card">
    <h1 class="auth-card__title">Create account</h1>
    <p class="auth-card__subtitle">Join Vex Chat</p>

    {#if errors.form}
      <p class="auth-card__error">{errors.form}</p>
    {/if}

    <form class="auth-form" onsubmit={handleRegister} novalidate>
      <div class="auth-form__field">
        <label for="username">Username</label>
        <div class="auth-form__input-wrap">
          <input
            id="username"
            type="text"
            placeholder="choose a username"
            bind:value={username}
            disabled={loading}
            maxlength={20}
            autocomplete="username"
            class:auth-form__input--error={errors.username}
            class:auth-form__input--ok={usernameStatus === 'available'}
          />
          {#if usernameStatus === 'checking'}
            <span class="auth-form__status auth-form__status--checking">checking…</span>
          {:else if usernameStatus === 'available'}
            <span class="auth-form__status auth-form__status--ok">available</span>
          {/if}
        </div>
        {#if errors.username}
          <span class="auth-form__error">{errors.username}</span>
        {/if}
      </div>

      <div class="auth-form__field">
        <label for="password">Password</label>
        <input
          id="password"
          type="password"
          placeholder="••••••••"
          bind:value={password}
          disabled={loading}
          autocomplete="new-password"
          class:auth-form__input--error={errors.password}
        />
        {#if errors.password}
          <span class="auth-form__error">{errors.password}</span>
        {/if}
      </div>

      <div class="auth-form__field">
        <label for="confirm">Confirm password</label>
        <input
          id="confirm"
          type="password"
          placeholder="••••••••"
          bind:value={confirm}
          disabled={loading}
          autocomplete="new-password"
          class:auth-form__input--error={errors.confirm}
        />
        {#if errors.confirm}
          <span class="auth-form__error">{errors.confirm}</span>
        {/if}
      </div>

      <button class="auth-form__submit" type="submit" disabled={loading || usernameStatus === 'taken'}>
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

  .auth-form__input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .auth-form__input-wrap input { width: 100%; }

  .auth-form__status {
    position: absolute;
    right: 8px;
    font-size: 11px;
    pointer-events: none;
  }

  .auth-form__status--checking { color: var(--text-muted); }
  .auth-form__status--ok { color: var(--success); }

  .auth-form__error {
    font-size: 12px;
    color: var(--danger);
  }

  .auth-form__input--error {
    border-color: var(--danger) !important;
  }

  .auth-form__input--ok {
    border-color: var(--success) !important;
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
