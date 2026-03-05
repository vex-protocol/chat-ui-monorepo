<script lang="ts">
  // Route: /messaging/:userID
  import { onMount } from 'svelte'
  import MessageBox from '../lib/MessageBox.svelte'
  import ChatInput from '../lib/ChatInput.svelte'
  import { messages, client } from '../lib/store/index.js'

  let { params }: { params: Record<string, string> } = $props()

  const targetUserID = $derived(params.userID ?? '')
  const threadMessages = $derived($messages[targetUserID] ?? [])

  let sending = $state(false)
  let sendError = $state('')

  onMount(() => {
    // Drain any pending inbox messages on mount
    $client?.fetchInbox().catch(console.error)
  })

  async function handleSend(content: string) {
    if (!$client || sending) return
    sending = true
    sendError = ''
    try {
      // Find the recipient's first device
      const devices = await $client.listDevices(targetUserID)
      const device = devices[0]
      if (!device) {
        sendError = 'Recipient has no registered devices.'
        return
      }
      const result = await $client.sendMail(content, device.deviceID, targetUserID)
      if (!result.ok) {
        sendError = result.error.message
      }
    } catch (err) {
      sendError = err instanceof Error ? err.message : 'Failed to send'
    } finally {
      sending = false
    }
  }
</script>

<div class="dm-pane">
  <header class="dm-pane__header">
    <span class="dm-pane__title">@{targetUserID.slice(0, 8)}</span>
    <div class="dm-pane__actions">
      <button class="dm-pane__action" title="Search" aria-label="Search">🔍</button>
    </div>
  </header>

  <MessageBox messages={threadMessages} />

  {#if sendError}
    <div class="dm-pane__error">{sendError}</div>
  {/if}

  <ChatInput onSend={handleSend} disabled={sending} placeholder="Send a direct message…" />
</div>

<style>
  .dm-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .dm-pane__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
    flex-shrink: 0;
  }

  .dm-pane__title {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .dm-pane__actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .dm-pane__action {
    width: 32px;
    height: 32px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--text-secondary);
    transition: background 0.1s, color 0.1s;
    filter: grayscale(1);
    opacity: 0.6;
  }

  .dm-pane__action:hover {
    background: var(--bg-hover);
    opacity: 1;
  }

  .dm-pane__error {
    padding: 6px 16px;
    background: color-mix(in srgb, var(--danger) 15%, transparent);
    color: var(--danger);
    font-size: 12px;
    flex-shrink: 0;
  }
</style>
