<script context="module" lang="ts">
  export interface MessageInputProps {
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onInput?: (value: string) => void;
    onSend?: (value: string) => void;
  }
</script>

<script lang="ts">
  export let className: MessageInputProps["className"] = "";
  export let value: MessageInputProps["value"] = "";
  export let placeholder: MessageInputProps["placeholder"] =
    "Type a message...";
  export let disabled: MessageInputProps["disabled"] = false;
  export let onInput: MessageInputProps["onInput"] = undefined;
  export let onSend: MessageInputProps["onSend"] = undefined;
</script>

<div class={`message-input ${className}`}>
  <textarea
    class="message-input__textarea"
    {value}
    {placeholder}
    {disabled}
    rows={1}
    on:input={(e) => {
      onInput?.(e.target.value);
    }}
    on:keydown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend?.(value ?? "");
      }
    }}
  /><button
    class="message-input__send"
    type="button"
    {disabled}
    on:click={(event) => {
      onSend?.(value ?? "");
    }}
  >
    Send
  </button>
</div>