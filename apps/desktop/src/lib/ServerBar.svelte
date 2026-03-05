<script lang="ts">
  import { push } from 'svelte-spa-router'
  import type { IServer } from '@vex-chat/types'
  import CreateServerModal from './CreateServerModal.svelte'

  let { serverList = [], activeServerID = '' }: { serverList?: IServer[]; activeServerID?: string } = $props()

  let showCreate = $state(false)
</script>

<nav class="server-bar" aria-label="Servers">
  <ul class="server-bar__list">
    {#each serverList as server (server.serverID)}
      <li>
        <button
          class="server-bar__item {activeServerID === server.serverID ? 'server-bar__item--active' : ''}"
          onclick={() => push(`/server/${server.serverID}/`)}
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

  .server-bar__item--add {
    font-size: 22px;
    color: var(--success);
    background: var(--bg-primary);
  }

  .server-bar__item--add:hover {
    background: var(--success);
    color: #fff;
  }

  .server-bar__divider {
    width: 32px;
    height: 1px;
    background: var(--border);
    margin: 2px 0;
  }
</style>
