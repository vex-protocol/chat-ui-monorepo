<script lang="ts">
  import { client } from './store/index.js'
  import type { IInvite } from '@vex-chat/types'

  let { serverID = '', serverName = '', onclose }: { serverID?: string; serverName?: string; onclose: () => void } = $props()

  let invites: IInvite[] = $state([])
  let loading = $state(true)
  let creating = $state(false)
  let error = $state('')
  let copied = $state('')

  async function loadInvites(): Promise<void> {
    try {
      invites = await $client!.listInvites(serverID)
    } catch {
      // ignore — empty list is fine
    } finally {
      loading = false
    }
  }

  async function createInvite(): Promise<void> {
    creating = true
    error = ''
    try {
      const invite = await $client!.createInvite(serverID, '1h')
      invites = [invite, ...invites]
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create invite'
    } finally {
      creating = false
    }
  }

  function copyLink(inviteID: string): void {
    navigator.clipboard.writeText(inviteID)
    copied = inviteID
    setTimeout(() => { if (copied === inviteID) copied = '' }, 2000)
  }

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onclose()
  }

  $effect(() => {
    if (serverID && $client) loadInvites()
  })
</script>

<svelte:window onkeydown={onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Invite people">
    <h2 class="modal__title">Invite people to {serverName}</h2>

    <button class="invite__create-btn" onclick={createInvite} disabled={creating}>
      {creating ? 'Creating…' : 'Create Invite Link'}
    </button>

    {#if error}
      <p class="invite__error">{error}</p>
    {/if}

    {#if loading}
      <p class="invite__empty">Loading…</p>
    {:else if invites.length === 0}
      <p class="invite__empty">No active invite links. Create one above.</p>
    {:else}
      <ul class="invite__list">
        {#each invites as invite (invite.inviteID)}
          <li class="invite__item">
            <code class="invite__code">{invite.inviteID}</code>
            <button class="invite__copy-btn" onclick={() => copyLink(invite.inviteID)}>
              {copied === invite.inviteID ? 'Copied!' : 'Copy'}
            </button>
          </li>
        {/each}
      </ul>
    {/if}

    <div class="modal__actions">
      <button class="modal__btn modal__btn--cancel" onclick={onclose}>Done</button>
    </div>
  </div>
</div>

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
  }

  .modal {
    background: var(--bg-primary);
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 24px;
    width: 400px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .modal__title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .invite__create-btn {
    background: var(--accent);
    color: #fff;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    align-self: flex-start;
    transition: opacity 0.15s;
  }

  .invite__create-btn:hover:not(:disabled) { opacity: 0.9; }
  .invite__create-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .invite__error {
    font-size: 12px;
    color: var(--danger);
    margin: 0;
  }

  .invite__empty {
    font-size: 13px;
    color: var(--text-muted);
    font-style: italic;
    margin: 0;
  }

  .invite__list {
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 200px;
    overflow-y: auto;
  }

  .invite__item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 6px 10px;
  }

  .invite__code {
    flex: 1;
    font-size: 12px;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .invite__copy-btn {
    flex-shrink: 0;
    padding: 4px 10px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: 600;
    background: var(--bg-hover);
    color: var(--text-secondary);
    border: 1px solid var(--border);
    transition: background 0.1s;
  }

  .invite__copy-btn:hover {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .modal__actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 2px;
  }

  .modal__btn {
    padding: 7px 16px;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  .modal__btn--cancel {
    background: transparent;
    color: var(--text-secondary);
    border: 1px solid var(--border);
  }

  .modal__btn--cancel:hover {
    background: var(--bg-hover);
  }
</style>
