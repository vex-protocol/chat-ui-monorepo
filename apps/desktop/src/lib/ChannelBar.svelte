<script lang="ts">
  import { push } from 'svelte-spa-router'
  import type { IChannel } from '@vex-chat/types'

  let {
    serverName = '',
    serverID = '',
    channels = [],
    activeChannelID = '',
  }: {
    serverName?: string
    serverID?: string
    channels?: IChannel[]
    activeChannelID?: string
  } = $props()

  function navToChannel(channelID: string) {
    push(`/server/${serverID}/${channelID}`)
  }
</script>

<nav class="channel-bar" aria-label="Channels">
  <div class="channel-bar__header">
    <span class="channel-bar__server-name">{serverName}</span>
  </div>

  <ul class="channel-bar__list">
    <li class="channel-bar__section-label">Text Channels</li>
    {#each channels as channel (channel.channelID)}
      <li>
        <button
          class="channel-bar__item {activeChannelID === channel.channelID ? 'channel-bar__item--active' : ''}"
          onclick={() => navToChannel(channel.channelID)}
        >
          <span class="channel-bar__prefix">#</span>
          <span class="channel-bar__name">{channel.name}</span>
        </button>
      </li>
    {/each}
  </ul>
</nav>

<style>
  .channel-bar {
    width: var(--channelbar-width);
    background: var(--bg-secondary);
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
    overflow-y: auto;
    border-right: 1px solid var(--border);
  }

  .channel-bar__header {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .channel-bar__server-name {
    font-weight: 600;
    font-size: 15px;
    color: var(--text-primary);
  }

  .channel-bar__section-label {
    list-style: none;
    padding: 16px 8px 4px 8px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .channel-bar__list {
    list-style: none;
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .channel-bar__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 8px;
    border-radius: 4px;
    color: var(--text-secondary);
    font-size: 14px;
    text-align: left;
    transition: background 0.1s, color 0.1s;
  }

  .channel-bar__item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .channel-bar__item--active {
    background: var(--bg-surface);
    color: var(--text-primary);
  }

  .channel-bar__prefix { color: var(--text-muted); flex-shrink: 0; }
  .channel-bar__name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  .channel-bar__badge {
    background: var(--danger);
    color: #fff;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 700;
    padding: 1px 5px;
    flex-shrink: 0;
  }
</style>
