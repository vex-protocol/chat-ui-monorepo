<script lang="ts">
  import { push } from 'svelte-spa-router'
  import type { IUser } from '@vex-chat/libvex'
  import { familiars, client } from './store/index.js'
  import { $familiars as familiarsStore, $dmUnreadCounts as unreadCounts } from '@vex-chat/store'
  import { getServerUrl } from './config.js'
  import Avatar from './Avatar.svelte'

  const serverUrl = getServerUrl()

  // ── Familiar persistence ─────────────────────────────────────────────────────

  const STORAGE_KEY = 'vex-familiars'

  function loadFamiliars(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (!saved) return
      const list = JSON.parse(saved) as IUser[]
      for (const u of list) familiarsStore.setKey(u.userID, u)
    } catch {
      // ignore
    }
  }

  function saveFamiliars(): void {
    const list = Object.values($familiars)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  }

  function addFamiliar(user: IUser): void {
    familiarsStore.setKey(user.userID, user)
    saveFamiliars()
  }

  loadFamiliars()

  // ── Search ────────────────────────────────────────────────────────────────────

  let query = $state('')
  let results: IUser[] = $state([])
  let searching = $state(false)
  let searchTimer: ReturnType<typeof setTimeout> | null = null

  function onInput(): void {
    if (searchTimer) clearTimeout(searchTimer)
    const q = query.trim()
    if (!q) { results = []; return }
    searching = true
    searchTimer = setTimeout(async () => {
      const [found] = await $client?.users.retrieve(q) ?? [null]
      results = found ? [found] : []
      searching = false
    }, 250)
  }

  function openDM(user: IUser): void {
    addFamiliar(user)
    query = ''
    results = []
    push(`/messaging/${user.userID}`)
  }

  const familiarList = $derived(Object.values($familiars))
</script>

<aside class="familiars" aria-label="Direct messages">
  <div class="familiars__header">
    <span class="familiars__title">Direct Messages</span>
  </div>

  <div class="familiars__search-wrap">
    <input
      class="familiars__search"
      type="text"
      placeholder="Search by exact username…"
      bind:value={query}
      oninput={onInput}
      aria-label="Search users"
    />
  </div>

  {#if results.length > 0}
    <ul class="familiars__results" role="listbox">
      {#each results as user (user.userID)}
        <li>
          <button
            class="familiars__result-item"
            onclick={() => openDM(user)}
            role="option"
            aria-selected="false"
          >
            <Avatar userID={user.userID} name={user.username} size={28} {serverUrl} />
            <span class="familiars__result-name">{user.username}</span>
          </button>
        </li>
      {/each}
    </ul>
  {:else if query.trim() && !searching}
    <p class="familiars__no-results">No users found</p>
  {/if}

  {#if searching}
    <p class="familiars__searching">Searching…</p>
  {/if}

  <ul class="familiars__list">
    {#each familiarList as user (user.userID)}
      <li>
        <button class="familiars__item" onclick={() => openDM(user)}>
          <Avatar userID={user.userID} name={user.username} size={28} {serverUrl} />
          <span class="familiars__name">{user.username}</span>
          {#if $unreadCounts[user.userID]}
            <span class="familiars__badge">{$unreadCounts[user.userID]}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ul>
</aside>

<style>
  .familiars {
    width: 220px;
    flex-shrink: 0;
    background: var(--bg-secondary);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .familiars__header {
    padding: 12px 12px 8px;
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .familiars__title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .familiars__search-wrap {
    padding: 8px 8px 4px;
    flex-shrink: 0;
  }

  .familiars__search {
    font-size: 13px;
    padding: 5px 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    width: 100%;
  }

  .familiars__search:focus {
    outline: none;
    border-color: var(--accent);
  }

  .familiars__results {
    list-style: none;
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 4px;
    margin: 0 8px 4px;
    overflow-y: auto;
    max-height: 160px;
    flex-shrink: 0;
  }

  .familiars__result-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    font-size: 13px;
    color: var(--text-secondary);
    text-align: left;
  }

  .familiars__result-item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .familiars__no-results,
  .familiars__searching {
    font-size: 12px;
    color: var(--text-muted);
    padding: 4px 12px;
    font-style: italic;
  }

  .familiars__list {
    list-style: none;
    flex: 1;
    overflow-y: auto;
    padding: 4px 8px;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .familiars__item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 8px;
    border-radius: 4px;
    font-size: 13px;
    color: var(--text-secondary);
    text-align: left;
    transition: background 0.1s, color 0.1s;
  }

  .familiars__item:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .familiars__badge {
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    border-radius: 9px;
    background: var(--danger, #e53935);
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-left: auto;
    flex-shrink: 0;
  }

  .familiars__name,
  .familiars__result-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
