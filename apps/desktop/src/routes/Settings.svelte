<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { theme, toggleTheme } from '../lib/stores/theme.js'
  import { client, user } from '../lib/store/index.js'
  import { getServerUrl, setServerUrl, loadCredentials, clearCredentials } from '../lib/config.js'
  import { encodeHex } from '@vex-chat/crypto'
  import { getSoundsEnabled, setSoundsEnabled, playNotify } from '../lib/sounds.js'

  // ── Sounds ──────────────────────────────────────────────────────────────────

  let soundsEnabled = $state(getSoundsEnabled())

  function toggleSounds(): void {
    soundsEnabled = !soundsEnabled
    setSoundsEnabled(soundsEnabled)
    if (soundsEnabled) playNotify()
  }

  // ── Server URL ──────────────────────────────────────────────────────────────

  let serverUrl = $state(getServerUrl())
  let serverUrlSaved = $state(false)

  function saveServerUrl(): void {
    setServerUrl(serverUrl.trim())
    serverUrlSaved = true
    setTimeout(() => { serverUrlSaved = false }, 2000)
  }

  // ── Account info ────────────────────────────────────────────────────────────

  const creds = loadCredentials()
  const fingerprint = creds?.deviceKey
    ? encodeHex(new Uint8Array(
        // First 8 bytes of the public key would be ideal, but we only have the secret seed.
        // Show truncated hex of the stored device key seed as a session identifier.
        Array.from({ length: 8 }, (_, i) => parseInt(creds.deviceKey.slice(i * 2, i * 2 + 2), 16))
      )).toUpperCase()
    : 'N/A'

  // ── Danger zone ─────────────────────────────────────────────────────────────

  let confirmClear = $state(false)
  let clearError = $state('')

  async function handleLogout(): Promise<void> {
    try {
      await $client?.logout()
    } catch { /* ignore */ }
    clearCredentials()
    push('/login')
  }

  function startClear(): void {
    confirmClear = true
    clearError = ''
  }

  async function confirmClearKeys(): Promise<void> {
    clearCredentials()
    confirmClear = false
    push('/register')
  }
</script>

<div class="settings-page">
  <header class="settings-page__header">
    <button class="settings-page__back" onclick={() => history.back()} aria-label="Go back">←</button>
    <h1 class="settings-page__title">Settings</h1>
  </header>

  <div class="settings-page__body">

    <!-- ── Appearance ── -->
    <section class="settings-section">
      <h2 class="settings-section__title">Appearance</h2>
      <div class="settings-row">
        <div class="settings-row__info">
          <span class="settings-row__label">Theme</span>
          <span class="settings-row__desc">Toggle between dark and light mode</span>
        </div>
        <button class="settings-btn" onclick={toggleTheme}>
          {$theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}
        </button>
      </div>
      <div class="settings-row">
        <div class="settings-row__info">
          <span class="settings-row__label">Sound effects</span>
          <span class="settings-row__desc">Play sounds for login, logout, errors, and notifications</span>
        </div>
        <button class="settings-btn settings-btn--toggle {soundsEnabled ? 'settings-btn--toggle-on' : ''}" onclick={toggleSounds}>
          {soundsEnabled ? 'On' : 'Off'}
        </button>
      </div>
    </section>

    <!-- ── Connection ── -->
    <section class="settings-section">
      <h2 class="settings-section__title">Connection</h2>
      <div class="settings-row settings-row--column">
        <label class="settings-row__label" for="server-url">Server URL</label>
        <span class="settings-row__desc">The Vex Chat server this client connects to</span>
        <div class="settings-row__input-row">
          <input
            id="server-url"
            class="settings-input"
            type="url"
            bind:value={serverUrl}
            placeholder="http://localhost:16777"
          />
          <button class="settings-btn" onclick={saveServerUrl} disabled={!serverUrl.trim()}>
            {serverUrlSaved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>
    </section>

    <!-- ── Account ── -->
    <section class="settings-section">
      <h2 class="settings-section__title">Account</h2>
      <div class="settings-row">
        <span class="settings-row__label">Username</span>
        <span class="settings-row__value">{$user?.username ?? creds?.username ?? '—'}</span>
      </div>
      <div class="settings-row">
        <span class="settings-row__label">User ID</span>
        <span class="settings-row__value settings-row__value--mono">{$user?.userID?.slice(0, 8) ?? '—'}…</span>
      </div>
      <div class="settings-row">
        <span class="settings-row__label">Device fingerprint</span>
        <span class="settings-row__value settings-row__value--mono">{fingerprint}…</span>
      </div>
    </section>

    <!-- ── Danger zone ── -->
    <section class="settings-section settings-section--danger">
      <h2 class="settings-section__title">Danger Zone</h2>

      <div class="settings-row">
        <div class="settings-row__info">
          <span class="settings-row__label">Sign out</span>
          <span class="settings-row__desc">Disconnect and return to the login screen</span>
        </div>
        <button class="settings-btn settings-btn--danger" onclick={handleLogout}>Sign out</button>
      </div>

      <div class="settings-row">
        <div class="settings-row__info">
          <span class="settings-row__label">Clear device keys</span>
          <span class="settings-row__desc">Permanently delete your device key from this device. You will need to re-register.</span>
        </div>
        {#if confirmClear}
          <div class="settings-confirm">
            <span class="settings-confirm__msg">Are you sure?</span>
            <button class="settings-btn settings-btn--danger" onclick={confirmClearKeys}>Yes, clear keys</button>
            <button class="settings-btn" onclick={() => { confirmClear = false }}>Cancel</button>
          </div>
        {:else}
          <button class="settings-btn settings-btn--danger" onclick={startClear}>Clear keys</button>
        {/if}
      </div>
    </section>

  </div>
</div>

<style>
  .settings-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .settings-page__header {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .settings-page__back {
    font-size: 18px;
    color: var(--text-secondary);
    padding: 4px 8px;
    border-radius: 4px;
  }

  .settings-page__back:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
  }

  .settings-page__title {
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .settings-page__body {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    display: flex;
    flex-direction: column;
    gap: 24px;
    max-width: 560px;
  }

  .settings-section {
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .settings-section--danger {
    border-color: color-mix(in srgb, var(--danger) 40%, transparent);
  }

  .settings-section__title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    padding: 10px 16px 6px;
    border-bottom: 1px solid var(--border);
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    gap: 12px;
    border-bottom: 1px solid var(--border);
  }

  .settings-row:last-child {
    border-bottom: none;
  }

  .settings-row--column {
    flex-direction: column;
    align-items: flex-start;
  }

  .settings-row__info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
    min-width: 0;
  }

  .settings-row__label {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .settings-row__desc {
    font-size: 12px;
    color: var(--text-muted);
  }

  .settings-row__value {
    font-size: 13px;
    color: var(--text-secondary);
  }

  .settings-row__value--mono {
    font-family: monospace;
    font-size: 12px;
  }

  .settings-row__input-row {
    display: flex;
    gap: 8px;
    width: 100%;
    margin-top: 6px;
  }

  .settings-input {
    flex: 1;
    padding: 7px 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 13px;
    min-width: 0;
  }

  .settings-input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .settings-btn {
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
    flex-shrink: 0;
  }

  .settings-btn:hover:not(:disabled) {
    background: var(--bg-hover);
  }

  .settings-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .settings-btn--toggle {
    min-width: 48px;
  }

  .settings-btn--toggle-on {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .settings-btn--danger {
    background: transparent;
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 50%, transparent);
  }

  .settings-btn--danger:hover:not(:disabled) {
    background: var(--danger);
    color: #fff;
  }

  .settings-confirm {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .settings-confirm__msg {
    font-size: 13px;
    color: var(--danger);
    font-weight: 600;
  }
</style>
