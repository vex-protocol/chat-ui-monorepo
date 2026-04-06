<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { theme, toggleTheme } from '../lib/stores/theme.js'
  import { client, user } from '../lib/store/index.js'
  import { getServerUrl, setServerUrl, clearSession } from '../lib/config.js'
  import { keyStore } from '../lib/keystore.js'
  import { getSoundsEnabled, setSoundsEnabled, playNotify } from '../lib/sounds.js'
  import { getNotificationsEnabled, setNotificationsEnabled } from '../lib/notifications.js'
  import { avatarHash } from '../lib/store/index.js'
  import Avatar from '../lib/Avatar.svelte'
  import { checkForUpdates, applyUpdate, type UpdateStatus } from '../lib/updater.js'
  import type { IDevice } from '@vex-chat/libvex'

  // ── Devices ────────────────────────────────────────────────────────────────

  let devices: IDevice[] = $state([])
  let devicesLoading = $state(false)
  let devicesError = $state('')
  let deleteConfirmID: string | null = $state(null)
  let deleteError = $state('')

  async function loadDevices(): Promise<void> {
    const userID = $user?.userID
    if (!userID || !$client) return
    devicesLoading = true
    devicesError = ''
    try {
      devices = await $client.listDevices(userID)
    } catch (err) {
      devicesError = err instanceof Error ? err.message : 'Failed to load devices'
    } finally {
      devicesLoading = false
    }
  }

  async function handleDeleteDevice(deviceID: string): Promise<void> {
    const userID = $user?.userID
    if (!userID || !$client) return
    deleteError = ''
    try {
      await $client.deleteDevice(userID, deviceID)
      devices = devices.filter(d => d.deviceID !== deviceID)
      deleteConfirmID = null
    } catch (err) {
      deleteError = err instanceof Error ? err.message : 'Failed to delete device'
    }
  }

  // Load devices on mount
  loadDevices()

  // ── Sounds ──────────────────────────────────────────────────────────────────

  let soundsEnabled = $state(getSoundsEnabled())

  function toggleSounds(): void {
    soundsEnabled = !soundsEnabled
    setSoundsEnabled(soundsEnabled)
    if (soundsEnabled) playNotify()
  }

  // ── Notifications ────────────────────────────────────────────────────────────

  let notificationsEnabled = $state(getNotificationsEnabled())

  function toggleNotifications(): void {
    notificationsEnabled = !notificationsEnabled
    setNotificationsEnabled(notificationsEnabled)
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

  let creds: import('@vex-chat/libvex').StoredCredentials | null = $state(null)
  let fingerprint = $derived(
    creds?.deviceKey
      ? creds.deviceKey.slice(0, 16).toUpperCase()
      : 'N/A'
  )

  // Load credentials from KeyStore on mount
  keyStore.loadActive().then((c) => { creds = c })

  // ── Avatar upload ────────────────────────────────────────────────────────────

  let avatarInput: HTMLInputElement | undefined = $state()
  let avatarError = $state('')
  let avatarUploading = $state(false)

  async function handleAvatarChange(e: Event): Promise<void> {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      avatarError = 'Image must be under 5 MB'
      return
    }

    const userID = $user?.userID
    if (!userID || !$client) {
      avatarError = 'Not authenticated'
      return
    }

    avatarError = ''
    avatarUploading = true
    try {
      const data = new Uint8Array(await file.arrayBuffer())
      await $client.setAvatar(data, file.type)
      avatarHash.set(Date.now())
    } catch (err) {
      avatarError = err instanceof Error ? err.message : 'Upload failed'
    } finally {
      avatarUploading = false
      if (avatarInput) avatarInput.value = ''
    }
  }

  // ── Updates ────────────────────────────────────────────────────────────────

  let updateStatus: UpdateStatus = $state({
    available: false,
    downloading: false,
    progress: 0,
    readyToInstall: false,
  })
  let checking = $state(false)

  async function handleCheckUpdate(): Promise<void> {
    checking = true
    await checkForUpdates((s) => { updateStatus = s })
    checking = false
  }

  // ── Danger zone ─────────────────────────────────────────────────────────────

  let confirmClear = $state(false)
  let clearError = $state('')

  async function handleLogout(): Promise<void> {
    try {
      await $client?.logout()
    } catch { /* ignore */ }
    // Clear the stored JWT so auto-login won't fire, but keep device keys
    if (creds) await keyStore.save({ ...creds, token: undefined })
    clearSession()
    push('/login')
  }

  function startClear(): void {
    confirmClear = true
    clearError = ''
  }

  async function confirmClearKeys(): Promise<void> {
    if (creds?.username) {
      await keyStore.clear(creds.username)
    }
    confirmClear = false
    push('/register')
  }
</script>

<div class="settings-page">
  <header class="settings-page__header">
    <button class="settings-page__back" onclick={() => {
      if (window.history.length > 1) history.back()
      else push('/home')
    }} aria-label="Go back">←</button>
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
      <div class="settings-row">
        <div class="settings-row__info">
          <span class="settings-row__label">Desktop notifications</span>
          <span class="settings-row__desc">Show OS alerts for incoming messages when the window is not focused</span>
        </div>
        <button class="settings-btn settings-btn--toggle {notificationsEnabled ? 'settings-btn--toggle-on' : ''}" onclick={toggleNotifications}>
          {notificationsEnabled ? 'On' : 'Off'}
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

    <!-- ── Updates ── -->
    <section class="settings-section">
      <h2 class="settings-section__title">Updates</h2>
      <div class="settings-row">
        <div class="settings-row__info">
          <span class="settings-row__label">Current version</span>
          <span class="settings-row__desc">v0.1.0</span>
        </div>
        {#if updateStatus.readyToInstall}
          <button class="settings-btn settings-btn--toggle-on" onclick={applyUpdate}>
            Restart to update
          </button>
        {:else if updateStatus.downloading}
          <span class="settings-row__value">Downloading… {Math.round(updateStatus.progress * 100)}%</span>
        {:else if updateStatus.available}
          <span class="settings-row__value">v{updateStatus.version} available</span>
        {:else if updateStatus.error}
          <span class="settings-row__desc settings-row__desc--error">{updateStatus.error}</span>
        {:else}
          <button class="settings-btn" onclick={handleCheckUpdate} disabled={checking}>
            {checking ? 'Checking…' : 'Check for updates'}
          </button>
        {/if}
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
      <div class="settings-row">
        <div class="settings-row__info">
          <span class="settings-row__label">Avatar</span>
          {#if avatarError}
            <span class="settings-row__desc settings-row__desc--error">{avatarError}</span>
          {:else}
            <span class="settings-row__desc">Upload a profile picture (JPG, PNG, GIF, or WebP, max 5 MB)</span>
          {/if}
        </div>
        <div class="settings-avatar-actions">
          {#if $user?.userID}
            <Avatar userID={$user.userID} serverUrl={serverUrl} version={$avatarHash} size={40} name={$user.username} />
          {/if}
          <button class="settings-btn" onclick={() => avatarInput?.click()} disabled={avatarUploading}>
            {avatarUploading ? 'Uploading…' : 'Change'}
          </button>
          <input
            bind:this={avatarInput}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            style="display:none"
            onchange={handleAvatarChange}
          />
        </div>
      </div>
    </section>

    <!-- ── Devices ── -->
    <section class="settings-section">
      <h2 class="settings-section__title">Devices</h2>
      {#if devicesLoading}
        <div class="settings-row">
          <span class="settings-row__desc">Loading devices…</span>
        </div>
      {:else if devicesError}
        <div class="settings-row">
          <span class="settings-row__desc settings-row__desc--error">{devicesError}</span>
          <button class="settings-btn" onclick={loadDevices}>Retry</button>
        </div>
      {:else}
        {#each devices as device (device.deviceID)}
          {@const isCurrent = creds?.deviceID === device.deviceID}
          <div class="settings-row settings-row--device">
            <div class="settings-row__info">
              <span class="settings-row__label">
                {device.name || 'Unnamed device'}
                {#if isCurrent}
                  <span class="device-badge">current</span>
                {/if}
              </span>
              <span class="settings-row__desc settings-row__value--mono">
                {device.signKey.slice(0, 16)}…
              </span>
              <span class="settings-row__desc">
                {device.lastLogin ? `Last login: ${new Date(device.lastLogin).toLocaleString()}` : 'Never logged in'}
              </span>
            </div>
            {#if !isCurrent}
              {#if deleteConfirmID === device.deviceID}
                <div class="settings-confirm">
                  <span class="settings-confirm__msg">Delete?</span>
                  <button class="settings-btn settings-btn--danger" onclick={() => handleDeleteDevice(device.deviceID)}>Yes</button>
                  <button class="settings-btn" onclick={() => { deleteConfirmID = null; deleteError = '' }}>No</button>
                </div>
              {:else}
                <button
                  class="settings-btn settings-btn--danger"
                  onclick={() => { deleteConfirmID = device.deviceID; deleteError = '' }}
                  disabled={devices.length <= 1}
                  title={devices.length <= 1 ? 'Cannot delete your last device' : 'Remove this device'}
                >
                  Delete
                </button>
              {/if}
            {/if}
          </div>
        {/each}
        {#if deleteError}
          <div class="settings-row">
            <span class="settings-row__desc settings-row__desc--error">{deleteError}</span>
          </div>
        {/if}
      {/if}
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

  .settings-row__desc--error {
    color: var(--danger);
  }

  .settings-avatar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
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

  .device-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 1px 6px;
    margin-left: 6px;
    border-radius: 3px;
    background: var(--accent);
    color: #fff;
    vertical-align: middle;
  }

  .settings-row--device {
    align-items: flex-start;
  }
</style>
