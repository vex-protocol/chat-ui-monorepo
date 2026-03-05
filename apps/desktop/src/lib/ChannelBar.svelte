<script lang="ts">
  import { push } from 'svelte-spa-router'
  import type { IChannel } from '@vex-chat/types'
  import { client } from './store/index.js'
  import { $channels as channelsStore } from '@vex-chat/store'

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

  function navToChannel(channelID: string): void {
    push(`/server/${serverID}/${channelID}`)
  }

  // ── Add channel ─────────────────────────────────────────────────────────────

  let addingChannel = $state(false)
  let newChannelName = $state('')
  let addingError = $state('')

  function startAddChannel(): void {
    addingChannel = true
    newChannelName = ''
    addingError = ''
  }

  function cancelAddChannel(): void {
    addingChannel = false
    newChannelName = ''
  }

  async function submitAddChannel(e: Event): Promise<void> {
    e.preventDefault()
    const name = newChannelName.trim()
    if (!name || !serverID) return
    addingError = ''
    try {
      const channel = await $client!.createChannel(serverID, name)
      const current = channelsStore.get()[serverID] ?? []
      channelsStore.setKey(serverID, [...current, channel])
      addingChannel = false
      newChannelName = ''
      push(`/server/${serverID}/${channel.channelID}`)
    } catch (err) {
      addingError = err instanceof Error ? err.message : 'Failed'
    }
  }

  function onInputKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') cancelAddChannel()
  }
</script>

<nav class="channel-bar" aria-label="Channels">
  <div class="channel-bar__header">
    <span class="channel-bar__server-name">{serverName}</span>
  </div>

  <ul class="channel-bar__list">
    <li class="channel-bar__section-label">
      <span>Text Channels</span>
      <button
        class="channel-bar__add-btn"
        title="Add channel"
        aria-label="Add channel"
        onclick={startAddChannel}
      >+</button>
    </li>

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

    {#if addingChannel}
      <li class="channel-bar__add-row">
        <form onsubmit={submitAddChannel}>
          <input
            class="channel-bar__add-input"
            type="text"
            placeholder="channel-name"
            bind:value={newChannelName}
            onkeydown={onInputKeydown}
            maxlength={32}
            autofocus
            autocomplete="off"
          />
          {#if addingError}
            <p class="channel-bar__add-error">{addingError}</p>
          {/if}
          <div class="channel-bar__add-actions">
            <button type="submit" class="channel-bar__add-submit" disabled={!newChannelName.trim()}>Add</button>
            <button type="button" class="channel-bar__add-cancel" onclick={cancelAddChannel}>Cancel</button>
          </div>
        </form>
      </li>
    {/if}
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
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .channel-bar__add-btn {
    font-size: 16px;
    color: var(--text-muted);
    line-height: 1;
    padding: 0 2px;
    border-radius: 3px;
  }

  .channel-bar__add-btn:hover {
    color: var(--text-primary);
    background: var(--bg-hover);
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

  /* Add channel inline form */
  .channel-bar__add-row {
    list-style: none;
    padding: 4px 2px;
  }

  .channel-bar__add-input {
    width: 100%;
    padding: 5px 8px;
    background: var(--bg-surface);
    border: 1px solid var(--accent);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 13px;
    box-sizing: border-box;
  }

  .channel-bar__add-input:focus {
    outline: none;
  }

  .channel-bar__add-error {
    font-size: 11px;
    color: var(--danger);
    margin: 2px 0 0;
  }

  .channel-bar__add-actions {
    display: flex;
    gap: 4px;
    margin-top: 4px;
  }

  .channel-bar__add-submit,
  .channel-bar__add-cancel {
    flex: 1;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }

  .channel-bar__add-submit {
    background: var(--accent);
    color: #fff;
    border: none;
  }

  .channel-bar__add-submit:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .channel-bar__add-cancel {
    background: transparent;
    color: var(--text-muted);
    border: 1px solid var(--border);
  }

  .channel-bar__add-cancel:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
</style>
