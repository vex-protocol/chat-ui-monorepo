<script lang="ts">
  import { push } from 'svelte-spa-router'
  import { client } from './store/index.js'
  import { clearCredentials } from './config.js'
  import { playLock } from './sounds.js'

  let { username = '', userID = '' }: { username?: string; userID?: string } = $props()

  let menuOpen = $state(false)

  async function logout(): Promise<void> {
    menuOpen = false
    playLock()
    try { await $client?.logout() } catch { /* ignore */ }
    clearCredentials()
    push('/login')
  }

  function openSettings(): void {
    menuOpen = false
    push('/settings')
  }
</script>

<div class="user-menu">
  <button
    class="user-menu__trigger"
    onclick={() => (menuOpen = !menuOpen)}
    aria-label="User menu"
    aria-expanded={menuOpen}
  >
    <div class="user-menu__avatar" title={username}>
      {username ? username[0]?.toUpperCase() : '?'}
    </div>
    <span class="user-menu__name">{username || 'Not logged in'}</span>
  </button>

  {#if menuOpen}
    <div class="user-menu__dropdown" role="menu">
      <button class="user-menu__item" role="menuitem" onclick={openSettings}>
        Settings
      </button>
      <div class="user-menu__divider" role="separator"></div>
      <button class="user-menu__item user-menu__item--danger" role="menuitem" onclick={logout}>
        Sign out
      </button>
    </div>
  {/if}
</div>

{#if menuOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="user-menu__backdrop" role="presentation" onclick={() => (menuOpen = false)}></div>
{/if}

<style>
  .user-menu {
    position: relative;
    padding: 8px;
    border-top: 1px solid var(--border);
    background: var(--bg-tertiary);
    flex-shrink: 0;
  }

  .user-menu__trigger {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    border-radius: 4px;
    transition: background 0.1s;
  }

  .user-menu__trigger:hover { background: var(--bg-hover); }

  .user-menu__avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .user-menu__name {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .user-menu__dropdown {
    position: absolute;
    bottom: calc(100% + 4px);
    left: 8px;
    right: 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    overflow: hidden;
    z-index: 100;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  }

  .user-menu__item {
    width: 100%;
    padding: 8px 12px;
    text-align: left;
    font-size: 13px;
    color: var(--text-primary);
    transition: background 0.1s;
  }

  .user-menu__item:hover { background: var(--bg-hover); }
  .user-menu__item--danger { color: var(--danger); }
  .user-menu__item--danger:hover { background: var(--danger); color: #fff; }

  .user-menu__divider { height: 1px; background: var(--border); }

  .user-menu__backdrop {
    position: fixed;
    inset: 0;
    z-index: 99;
  }
</style>
