<script lang="ts">
  import type { IMessage } from '@vex-chat/libvex'
  import { onMount } from 'svelte'
  import { chunkMessages, renderContent, handleLinkClick, formatTime, parseFileExtra, isImageType, formatFileSize } from './utils/messages.js'
  import { user, client } from './store/index.js'
  import { getServerUrl } from './config.js'
  import Avatar from './Avatar.svelte'

  const serverUrl = getServerUrl()

  function fileUrl(fileID: string): string {
    return $client?.fileUrl(fileID) ?? `${serverUrl}/file/${fileID}`
  }

  let { messages = [], usernames = {} }: { messages: IMessage[]; usernames?: Record<string, string> } = $props()

  const chunks = $derived(chunkMessages(messages))

  let containerEl: HTMLDivElement | null = $state(null)
  let autoScroll = true

  function scrollToBottom(): void {
    if (containerEl && autoScroll) {
      containerEl.scrollTop = containerEl.scrollHeight
    }
  }

  function onScroll(): void {
    if (!containerEl) return
    const distFromBottom = containerEl.scrollHeight - containerEl.scrollTop - containerEl.clientHeight
    autoScroll = distFromBottom < 120
  }

  // Scroll to bottom whenever messages change
  $effect(() => {
    void messages.length // reactive dependency
    // nextTick equivalent — wait for DOM to update
    setTimeout(scrollToBottom, 0)
  })

  onMount(() => {
    scrollToBottom()
  })
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
  class="message-box"
  bind:this={containerEl}
  onscroll={onScroll}
  onclick={handleLinkClick}
  role="log"
  aria-label="Messages"
  aria-live="polite"
>
  {#if chunks.length === 0}
    <div class="message-box__empty">No messages yet.</div>
  {/if}

  {#each chunks as chunk (chunk.firstTime + chunk.authorID)}
    {#if chunk.messages[0]?.mailType === 'system'}
      <div class="message-system">
        <span class="message-system__text">{chunk.messages[0].content}</span>
      </div>
    {:else}
      <div class="message-chunk">
        <div class="message-chunk__header">
          <Avatar userID={chunk.authorID} size={36} {serverUrl} />
          <div class="message-chunk__meta">
            <span
              class="message-chunk__author"
              class:message-chunk__author--self={chunk.authorID === $user?.userID}
            >
              {chunk.authorID === $user?.userID ? 'You' : (usernames[chunk.authorID] ?? chunk.authorID.slice(0, 8))}
            </span>
            <span class="message-chunk__time">{formatTime(chunk.firstTime)}</span>
          </div>
        </div>

        {#each chunk.messages as msg (msg.mailID)}
          {@const fileInfo = parseFileExtra(msg.extra)}
          <div class="message">
            {#if fileInfo}
              {#if isImageType(fileInfo.contentType)}
                <img
                  src={fileUrl(fileInfo.fileID)}
                  alt={fileInfo.fileName}
                  class="message__image"
                  loading="lazy"
                />
              {:else}
                <a
                  href={fileUrl(fileInfo.fileID)}
                  class="message__file"
                  data-external={fileUrl(fileInfo.fileID)}
                  download={fileInfo.fileName}
                >
                  <span class="message__file-icon">📄</span>
                  <span class="message__file-info">
                    <span class="message__file-name">{fileInfo.fileName}</span>
                    <span class="message__file-size">{formatFileSize(fileInfo.fileSize)}</span>
                  </span>
                </a>
              {/if}
              {#if msg.content}
                {@html renderContent(msg.content)}
              {/if}
            {:else}
              {@html renderContent(msg.content)}
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  {/each}
</div>

<style>
  .message-box {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    padding: 12px 16px;
    gap: 2px;
  }

  .message-box__empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-size: 14px;
    font-style: italic;
  }

  .message-system {
    padding: 4px 16px;
    text-align: center;
  }

  .message-system__text {
    font-size: 12px;
    color: var(--text-muted);
    font-style: italic;
  }

  .message-chunk {
    padding: 4px 0;
  }

  .message-chunk__header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: 2px;
  }

  .message-chunk__meta {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding-top: 8px;
  }

  .message-chunk__author {
    font-weight: 600;
    font-size: 14px;
    color: var(--text-primary);
  }

  .message-chunk__author--self {
    color: var(--accent);
  }

  .message-chunk__time {
    font-size: 11px;
    color: var(--text-muted);
  }

  .message {
    padding-left: 46px;
    font-size: 14px;
    line-height: 1.5;
    color: var(--text-secondary);
    word-break: break-word;
  }

  /* ── File attachment styles ── */
  .message__image {
    max-width: 400px;
    max-height: 300px;
    border-radius: 6px;
    margin: 4px 0;
    display: block;
    cursor: pointer;
  }

  .message__file {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-surface);
    border: 1px solid var(--border);
    border-radius: 6px;
    margin: 4px 0;
    text-decoration: none;
    cursor: pointer;
    transition: background 0.1s;
  }

  .message__file:hover {
    background: var(--bg-hover);
  }

  .message__file-icon {
    font-size: 20px;
    filter: grayscale(1);
    flex-shrink: 0;
  }

  .message__file-info {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  .message__file-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--accent);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .message__file-size {
    font-size: 11px;
    color: var(--text-muted);
  }

  /* ── Markdown element styles ── */
  .message :global(p) { margin: 0; }
  .message :global(p + p) { margin-top: 4px; }

  .message :global(code) {
    background: var(--bg-surface);
    border-radius: 3px;
    padding: 1px 5px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
    color: var(--text-primary);
  }

  .message :global(pre) {
    background: var(--bg-tertiary);
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 10px 14px;
    overflow-x: auto;
    margin: 6px 0;
  }

  .message :global(pre code) {
    background: none;
    padding: 0;
    font-size: 13px;
  }

  .message :global(a) {
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
  }

  .message :global(blockquote) {
    border-left: 3px solid var(--border);
    margin: 4px 0;
    padding-left: 12px;
    color: var(--text-muted);
  }

  .message :global(strong) { color: var(--text-primary); font-weight: 600; }
  .message :global(em) { font-style: italic; }
  .message :global(del) { text-decoration: line-through; color: var(--text-muted); }

  .message :global(ul),
  .message :global(ol) {
    padding-left: 20px;
    margin: 2px 0;
  }

  .message :global(h1),
  .message :global(h2),
  .message :global(h3) {
    font-size: 15px;
    font-weight: 700;
    color: var(--text-primary);
    margin: 4px 0 2px;
  }
</style>
