<script lang="ts">
  import { push } from 'svelte-spa-router'

  interface Server { id: string; name: string; initial: string }

  // Placeholder — replaced by $servers atom in vex-chat-6m0
  let { servers = [], activeServerID = '' }: { servers?: Server[]; activeServerID?: string } = $props()

  function navToServer(id: string) {
    push(`/server/${id}/text/general`)
  }
</script>

<nav class="server-bar" aria-label="Servers">
  <ul class="server-bar__list">
    {#each servers as server (server.id)}
      <li>
        <button
          class="server-bar__item {activeServerID === server.id ? 'server-bar__item--active' : ''}"
          onclick={() => navToServer(server.id)}
          title={server.name}
          aria-label={server.name}
        >
          {server.initial}
        </button>
      </li>
    {/each}

    <li class="server-bar__divider" role="separator"></li>

    <li>
      <button class="server-bar__item server-bar__item--add" title="Add Server" aria-label="Add server">
        +
      </button>
    </li>
  </ul>
</nav>

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
