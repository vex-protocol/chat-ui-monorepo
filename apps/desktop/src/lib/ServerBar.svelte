<script lang="ts">
  import type { Channel, Server } from '@vex-chat/libvex'

  import { push } from 'svelte-spa-router'

  import { $totalDmUnread as totalDmUnread } from '@vex-chat/store'

  import CreateServerModal from './CreateServerModal.svelte'

  let { activeServerID, channelMap, serverList }: { activeServerID?: string; channelMap?: Record<string, Channel[]>; serverList?: Server[]; } = $props()

  function navigateToServer(serverID: string): void {
    const chans = channelMap[serverID] ?? []
    const first = chans[0]
    if (first) {
      push(`/server/${serverID}/${first.channelID}`)
    } else {
      push(`/server/${serverID}/`)
    }
  }

  let showCreate = $state(false)
</script>

<nav class="server-bar" aria-label="Servers">
  <ul class="server-bar__list">
    <li>
      <button
        class="server-bar__item server-bar__item--home {!activeServerID ? 'server-bar__item--active' : ''}"
        onclick={() => push('/home')}
        title="Direct Messages"
        aria-label="Direct Messages"
      >
        DM
        {#if $totalDmUnread > 0}
          <span class="server-bar__badge">{$totalDmUnread > 99 ? '99+' : $totalDmUnread}</span>
        {/if}
      </button>
    </li>

    <li class="server-bar__divider" role="separator"></li>

    {#each serverList as server (server.serverID)}
      <li>
        <button
          class="server-bar__item {activeServerID === server.serverID ? 'server-bar__item--active' : ''}"
          onclick={() => navigateToServer(server.serverID)}
          title={server.name}
          aria-label={server.name}
        >
          {server.name[0]?.toUpperCase() ?? '?'}
        </button>
      </li>
    {/each}

    <li class="server-bar__divider" role="separator"></li>

    <li>
      <button
        class="server-bar__item server-bar__item--add"
        title="Create Server"
        aria-label="Create server"
        onclick={() => { showCreate = true }}
      >
        +
      </button>
    </li>
  </ul>
</nav>

{#if showCreate}
  <CreateServerModal onclose={() => { showCreate = false }} />
{/if}

<style>
  .server-bar {
    width: var(--serverbar-width);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 8px 0;
    flex-shrink: 0;
    overflow-y: auto;
    border-right: 1px solid var(--border);
  }

  .server-bar__list {
    list-style: none;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 0 8px;
  }

  .server-bar__item {
    width: 48px;
    height: 48px;
    border-radius: 24px;
    background: var(--bg-surface);
    color: var(--text-secondary);
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-radius 0.15s, background 0.15s, color 0.15s;
    position: relative;
  }

  /* Pill indicator on the left edge */
  .server-bar__item::before {
    content: '';
    position: absolute;
    left: -8px;
    width: 4px;
    border-radius: 0 4px 4px 0;
    background: var(--text-primary);
    height: 0;
    transition: height 0.15s;
  }

  .server-bar__item:hover::before {
    height: 20px;
  }

  .server-bar__item:hover {
    border-radius: 16px;
    background: var(--accent);
    color: #fff;
  }

  .server-bar__item--active {
    border-radius: 16px;
    background: var(--accent);
    color: #fff;
  }

  .server-bar__item--active::before {
    height: 36px;
  }

  .server-bar__item--home {
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .server-bar__item--add {
    font-size: 22px;
    color: var(--success);
    background: var(--bg-primary);
  }

  .server-bar__item--add:hover {
    background: var(--success);
    color: #fff;
  }

  .server-bar__badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    min-width: 18px;
    height: 18px;
    padding: 0 4px;
    border-radius: 9px;
    background: var(--danger, #e53935);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-secondary);
    line-height: 1;
  }

  .server-bar__divider {
    width: 32px;
    height: 1px;
    background: var(--border);
    margin: 2px 0;
  }
</style>
