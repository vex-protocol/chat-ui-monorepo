<script lang="ts">
  import { markRead, sendDirectMessage } from '@vex-chat/store'

  import ChatInput from '../lib/ChatInput.svelte'
  // Route: /messaging/:userID
  import MessageBox from '../lib/MessageBox.svelte'
  import { client, familiars, messages } from '../lib/store/index.js'

  let { params }: { params: Record<string, string> } = $props()

  const targetUserID = $derived(params.userID ?? '')

  // Clear unread count when viewing this conversation
  $effect(() => {
    if (targetUserID) markRead(targetUserID)
  })
  const threadMessages = $derived($messages[targetUserID] ?? [])
  const targetUsername = $derived($familiars[targetUserID]?.username ?? targetUserID.slice(0, 8))
  const usernameMap = $derived({ [targetUserID]: targetUsername })

  let sending = $state(false)
  let sendError = $state('')
  let showFingerprint = $state(false)
  let fingerprint = $state('')
  let _theirSignKey = $state('')

  // Fetch the recipient's signKey and compute the fingerprint
  $effect(() => {
    if (!$client || !targetUserID) return
    // TODO: fetchKeyBundle and getFingerprint not yet exposed in public API
    // $client.devices.list(targetUserID).then(devices => { ... })
    targetUserID
  })

  // TODO: verified key UI removed — needs secure storage re-implementation

  async function handleSend(content: string, _attachment?: File) {
    if (!$client || sending) return
    sending = true
    sendError = ''
    try {
      // TODO: file _attachment upload — needs client.files.create() integration
      const result = await sendDirectMessage(targetUserID, content)
      if (!result.ok) {
        sendError = result.error ?? 'Failed to send'
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
    <span class="dm-pane__title">@{targetUsername}</span>
    <div class="dm-pane__actions">
      {#if fingerprint}
        <button
          class="dm-pane__action dm-pane__shield"
          title="Session fingerprint"
          aria-label="Session fingerprint"
          onclick={() => { showFingerprint = !showFingerprint }}
        >
          🟡
        </button>
      {/if}
      <button class="dm-pane__action" title="Search" aria-label="Search">🔍</button>
    </div>
  </header>

  <!-- TODO: fingerprint verification panel — needs secure storage for verified keys -->

  <MessageBox messages={threadMessages} usernames={usernameMap} />

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

  .dm-pane__shield {
    filter: none;
    opacity: 1;
  }

  .dm-pane__shield--verified {
    filter: none;
    opacity: 1;
  }

  .fingerprint-panel {
    padding: 12px 16px;
    background: var(--bg-secondary);
    border-bottom: 1px solid var(--border);
    flex-shrink: 0;
  }

  .fingerprint-panel__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .fingerprint-panel__title {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .fingerprint-panel__close {
    width: 24px;
    height: 24px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    color: var(--text-muted);
  }

  .fingerprint-panel__close:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }

  .fingerprint-panel__code {
    display: block;
    font-family: monospace;
    font-size: 16px;
    letter-spacing: 0.1em;
    color: var(--text-primary);
    padding: 8px 0;
    word-break: break-all;
  }

  .fingerprint-panel__desc {
    font-size: 12px;
    color: var(--text-muted);
    margin: 4px 0 8px;
    line-height: 1.4;
  }

  .fingerprint-panel__btn {
    padding: 6px 14px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    background: var(--bg-surface);
    color: var(--text-primary);
    border: 1px solid var(--border);
  }

  .fingerprint-panel__btn:hover {
    background: var(--bg-hover);
  }

  .fingerprint-panel__btn--verified {
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    border-color: var(--accent);
    color: var(--accent);
  }

  .dm-pane__error {
    padding: 6px 16px;
    background: color-mix(in srgb, var(--danger) 15%, transparent);
    color: var(--danger);
    font-size: 12px;
    flex-shrink: 0;
  }
</style>
