<script lang="ts">
  import { client, servers, channels } from './store/index.js'
  import { $servers as serversStore, $channels as channelsStore } from '@vex-chat/store'
  import { push } from 'svelte-spa-router'

  let { onclose }: { onclose: () => void } = $props()

  let name = $state('')
  let error = $state('')
  let submitting = $state(false)

  async function submit(e: Event): Promise<void> {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    submitting = true
    error = ''
    try {
      const server = await $client!.createServer(n, n.slice(0, 1).toUpperCase())
      serversStore.setKey(server.serverID, server)
      const channel = await $client!.createChannel(server.serverID, 'general')
      channelsStore.setKey(server.serverID, [channel])
      onclose()
      push(`/server/${server.serverID}/${channel.channelID}`)
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to create server'
    } finally {
      submitting = false
    }
  }

  function onkeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') onclose()
  }
</script>

<svelte:window onkeydown={onkeydown} />

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="modal-backdrop" onclick={onclose}>
  <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
  <div class="modal" onclick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Create server">
    <h2 class="modal__title">Create a Server</h2>
    <form onsubmit={submit}>
      <label class="modal__label" for="server-name">Server Name</label>
      <input
        id="server-name"
        class="modal__input"
        type="text"
        bind:value={name}
        placeholder="My Awesome Server"
        maxlength={64}
        disabled={submitting}
        autocomplete="off"
        autofocus
      />
      {#if error}
        <p class="modal__error">{error}</p>
      {/if}
      <div class="modal__actions">
        <button type="button" class="modal__btn modal__btn--cancel" onclick={onclose} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" class="modal__btn modal__btn--submit" disabled={!name.trim() || submitting}>
          {submitting ? 'Creating…' : 'Create'}
        </button>
      </div>
    </form>
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
    width: 340px;
    max-width: 90vw;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .modal__title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .modal__label {
    display: block;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin-bottom: 6px;
  }

  .modal__input {
    width: 100%;
    padding: 8px 10px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 4px;
    color: var(--text-primary);
    font-size: 14px;
    box-sizing: border-box;
  }

  .modal__input:focus {
    outline: none;
    border-color: var(--accent);
  }

  .modal__error {
    font-size: 12px;
    color: var(--danger);
    margin: 0;
  }

  .modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 4px;
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

  .modal__btn--submit {
    background: var(--accent);
    color: #fff;
    border: none;
  }

  .modal__btn--submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .modal__btn--submit:not(:disabled):hover {
    filter: brightness(1.1);
  }
</style>
