<script lang="ts">
  import { onMount } from 'svelte'
  import { client } from './store/index.js'
  import { getServerUrl } from './config.js'
  import Avatar from './Avatar.svelte'
  import type { IUser } from '@vex-chat/libvex'

  let { serverID = '', channelID = '' }: { serverID?: string; channelID?: string } = $props()

  const ONLINE_THRESHOLD = 1000 * 60 * 5 // 5 minutes

  let members: IUser[] = $state([])
  let loading = $state(false)

  function isOnline(user: IUser): boolean {
    if (!user.lastSeen) return false
    return Date.now() - new Date(user.lastSeen).getTime() < ONLINE_THRESHOLD
  }

  const online = $derived(members.filter(isOnline))
  const offline = $derived(members.filter(u => !isOnline(u)))

  // Fetch on mount and when channelID changes, poll every 30s.
  // Capture $client and channelID as explicit dependencies;
  // use captured values in callbacks to avoid re-tracking.
  $effect(() => {
    const cid = channelID
    const c = $client
    if (!cid || !c) return

    let active = true
    loading = true

    c.channels.userList(cid)
      .then((result) => { if (active) { members = result; loading = false } })
      .catch(() => { if (active) loading = false })

    const interval = setInterval(() => {
      c.channels.userList(cid)
        .then((result) => { if (active) members = result })
        .catch(() => {})
    }, 30_000)

    return () => { active = false; clearInterval(interval) }
  })
</script>

<aside class="members-panel" aria-label="Members">
  <div class="members-panel__header">
    <span class="members-panel__title">Members — {members.length}</span>
  </div>

  <div class="members-panel__list">
    {#if online.length > 0}
      <div class="members-panel__section-label">Online — {online.length}</div>
      {#each online as user (user.userID)}
        <div class="members-panel__member">
          <div class="members-panel__avatar-wrap">
            <Avatar userID={user.userID} serverUrl={getServerUrl()} size={28} name={user.username} />
            <span class="members-panel__dot members-panel__dot--online"></span>
          </div>
          <span class="members-panel__name">{user.username}</span>
        </div>
      {/each}
    {/if}

    {#if offline.length > 0}
      <div class="members-panel__section-label">Offline — {offline.length}</div>
      {#each offline as user (user.userID)}
        <div class="members-panel__member members-panel__member--offline">
          <div class="members-panel__avatar-wrap">
            <Avatar userID={user.userID} serverUrl={getServerUrl()} size={28} name={user.username} />
          </div>
          <span class="members-panel__name">{user.username}</span>
        </div>
      {/each}
    {/if}

    {#if loading && members.length === 0}
      <div class="members-panel__empty">
        <p class="members-panel__empty-text">Loading members...</p>
      </div>
    {/if}
  </div>
</aside>

<style>
  .members-panel {
    width: 220px;
    flex-shrink: 0;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .members-panel__header {
    padding: 12px 12px 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .members-panel__title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .members-panel__list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
  }

  .members-panel__section-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    padding: 12px 4px 4px;
  }

  .members-panel__member {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 4px;
    border-radius: 4px;
    transition: background 0.1s;
  }

  .members-panel__member:hover {
    background: var(--bg-hover);
  }

  .members-panel__member--offline {
    opacity: 0.5;
  }

  .members-panel__avatar-wrap {
    position: relative;
    flex-shrink: 0;
  }

  .members-panel__dot {
    position: absolute;
    bottom: -1px;
    right: -1px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 2px solid var(--bg-secondary);
  }

  .members-panel__dot--online {
    background: var(--success);
  }

  .members-panel__name {
    font-size: 13px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .members-panel__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
  }

  .members-panel__empty-text {
    font-size: 12px;
    color: var(--text-muted);
    text-align: center;
    font-style: italic;
  }
</style>
