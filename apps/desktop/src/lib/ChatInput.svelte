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
  <div class="chat-input__wrap">
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
    <div class="chat-input__icons">
      <button class="chat-input__icon" title="Attach file" aria-label="Attach file" disabled>📎</button>
      <button class="chat-input__icon" title="Emoji" aria-label="Emoji" disabled>😊</button>
      {#if value.trim()}
        <button
          class="chat-input__send"
          onclick={send}
          disabled={!value.trim() || disabled}
          aria-label="Send message"
          title="Send (Enter)"
        >↑</button>
      {/if}
    </div>
  </div>
</div>

<style>
  .chat-input {
    padding: 10px 16px 12px;
    border-top: 1px solid var(--border);
    background: var(--bg-primary);
    flex-shrink: 0;
  }

  .chat-input__wrap {
    display: flex;
    align-items: flex-end;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 8px;
    transition: border-color 0.15s;
  }

  .chat-input__wrap:focus-within {
    border-color: var(--accent);
  }

  .chat-input__textarea {
    flex: 1;
    resize: none;
    line-height: 1.5;
    padding: 8px 12px;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 14px;
    font-family: inherit;
    max-height: 144px;
    overflow-y: auto;
    width: auto;
  }

  .chat-input__textarea:focus {
    outline: none;
  }

  .chat-input__textarea:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .chat-input__icons {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    flex-shrink: 0;
  }

  .chat-input__icon {
    width: 28px;
    height: 28px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--text-muted);
    filter: grayscale(1);
    opacity: 0.5;
    transition: opacity 0.1s;
  }

  .chat-input__icon:not(:disabled):hover {
    opacity: 0.8;
    background: var(--bg-hover);
  }

  .chat-input__icon:disabled {
    cursor: default;
  }

  .chat-input__send {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
    transition: opacity 0.15s;
  }

  .chat-input__send:not(:disabled):hover {
    opacity: 0.85;
  }

  .chat-input__send:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
</style>
