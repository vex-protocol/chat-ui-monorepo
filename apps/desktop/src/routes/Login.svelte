<script lang="ts">
  import { push } from 'svelte-spa-router'

  // Form state — wired to VexClient in vex-chat-vyp
  let username = $state('')
  let password = $state('')
  let error = $state('')
  let loading = $state(false)

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault()
    loading = true
    error = ''
    // TODO (vex-chat-vyp): load key file, call bootstrap(serverUrl, deviceID, deviceKey)
    //   on success $user atom will be set → navigate to messaging
    console.log('Login:', username)
    loading = false
    error = 'Auth not yet wired (vex-chat-vyp)'
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

  .auth-card__title {
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .auth-card__subtitle {
    font-size: 13px;
    color: var(--text-secondary);
    margin-top: -10px;
  }

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

  .auth-card__footer {
    font-size: 13px;
    color: var(--text-secondary);
    text-align: center;
  }

  .auth-card__link {
    color: var(--accent);
    text-decoration: underline;
    font-size: 13px;
  }
</style>
