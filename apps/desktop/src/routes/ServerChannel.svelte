<script lang="ts">
  // Route: /server/:serverID/:channelID
  import { onMount } from 'svelte'
  import MessageBox from '../lib/MessageBox.svelte'
  import ChatInput from '../lib/ChatInput.svelte'
  import { groupMessages, client, channels } from '../lib/store/index.js'

  let { params }: { params: Record<string, string> } = $props()

  const serverID = $derived(params.serverID ?? '')
  const channelID = $derived(params.channelID ?? '')
  const channelMessages = $derived($groupMessages[channelID] ?? [])
  const channelName = $derived(
    $channels[serverID]?.find(c => c.channelID === channelID)?.name ?? channelID.slice(0, 8),
  )

  let sending = $state(false)
  let sendError = $state('')

  onMount(() => {
    $client?.fetchInbox().catch(console.error)
  })

  async function handleSend(content: string) {
    if (!$client || sending) return
    sending = true
    sendError = ''
    try {
      // Group messages: send to each channel member's device.
      // Requires server-side member enumeration (GET /server/:id/members).
      // Until that endpoint exists, we log a warning and no-op.
      //
      // TODO (vex-chat-14y): replace with real member enumeration once
      // GET /server/:id/members is implemented in spire.
      console.warn('[ServerChannel] Group send not yet implemented — needs /server/:id/members')
      sendError = 'Group messaging coming soon.'
    } finally {
      sending = false
    }
  }
</script>

<div class="channel-pane">
  <header class="channel-pane__header">
    <div class="channel-pane__title-group">
      <span class="channel-pane__hash">#</span>
      <span class="channel-pane__name">{channelName}</span>
    </div>
    <div class="channel-pane__actions">
      <button class="channel-pane__action" title="Notification settings" aria-label="Notification settings">🔔</button>
      <button class="channel-pane__action" title="Toggle members" aria-label="Toggle members">👥</button>
      <button class="channel-pane__action" title="Search" aria-label="Search">🔍</button>
    </div>
  </header>

  <MessageBox messages={channelMessages} />

  {#if sendError}
    <div class="channel-pane__error">{sendError}</div>
  {/if}

  <ChatInput
    onSend={handleSend}
    disabled={sending}
    placeholder="Message #{channelName}"
  />
</div>

<style>
  .channel-pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-primary);
  }

  .channel-pane__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-secondary);
    flex-shrink: 0;
  }

  .channel-pane__title-group {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .channel-pane__hash {
    color: var(--text-muted);
    font-size: 18px;
    font-weight: 400;
    line-height: 1;
  }

  .channel-pane__name {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .channel-pane__actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .channel-pane__action {
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

  .channel-pane__action:hover {
    background: var(--bg-hover);
    opacity: 1;
  }

  .channel-pane__error {
    padding: 6px 16px;
    background: color-mix(in srgb, var(--warning) 15%, transparent);
    color: var(--warning);
    font-size: 12px;
    flex-shrink: 0;
  }
</style>
