<script lang="ts">
  let {
    onSend,
    disabled = false,
    placeholder = 'Type a message…',
  }: {
    onSend: (content: string) => void
    disabled?: boolean
    placeholder?: string
  } = $props()

  let value = $state('')
  let textareaEl: HTMLTextAreaElement | null = $state(null)

  function autoResize(): void {
    if (!textareaEl) return
    textareaEl.style.height = 'auto'
    // 6 rows × 24px line-height ≈ 144px max
    textareaEl.style.height = Math.min(textareaEl.scrollHeight, 144) + 'px'
  }

  function handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  function send(): void {
    const trimmed = value.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    value = ''
    if (textareaEl) textareaEl.style.height = 'auto'
  }
</script>

<div class="chat-input">
  <textarea
    bind:this={textareaEl}
    bind:value
    rows={1}
    {placeholder}
    {disabled}
    onkeydown={handleKeyDown}
    oninput={autoResize}
    class="chat-input__textarea"
    aria-label="Message input"
  ></textarea>

  <button
    class="chat-input__send"
    onclick={send}
    disabled={!value.trim() || disabled}
    aria-label="Send message"
    title="Send (Enter)"
  >
    ↑
  </button>
</div>

<style>
  .chat-input {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 10px 16px 12px;
    border-top: 1px solid var(--border);
    background: var(--bg-primary);
    flex-shrink: 0;
  }

  .chat-input__textarea {
    flex: 1;
    resize: none;
    line-height: 1.5;
    padding: 8px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    max-height: 144px;
    overflow-y: auto;
    transition: border-color 0.15s;
    width: auto;
  }

  .chat-input__textarea:focus {
    outline: none;
    border-color: var(--accent);
  }

  .chat-input__textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-input__send {
    width: 34px;
    height: 34px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--bg-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    flex-shrink: 0;
    transition: opacity 0.15s;
    margin-bottom: 1px;
  }

  .chat-input__send:not(:disabled):hover {
    opacity: 0.85;
  }

  .chat-input__send:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
