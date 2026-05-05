<script context="module" lang="ts">
  export interface MessageBubbleProps {
    author?: string;
    className?: string;
    content?: string;
    isOwn?: boolean;
    timestamp?: string;
  }
</script>

<script lang="ts">
  export let isOwn: MessageBubbleProps["isOwn"] = false;
  export let className: MessageBubbleProps["className"] = "";
  export let author: MessageBubbleProps["author"] = "";
  export let content: MessageBubbleProps["content"] = "";
  export let timestamp: MessageBubbleProps["timestamp"] = "";
</script>

<div
  class={`message-bubble ${isOwn ? "message-bubble--own" : ""} ${className}`}
>
  <span class="message-bubble__author">{author}</span>
  <p class="message-bubble__content">{content}</p>
  <time class="message-bubble__timestamp">{timestamp}</time>
</div>