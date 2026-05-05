<script context="module" lang="ts">
  export interface MessageInputProps {
    className?: string;
    disabled?: boolean;
    onInput?: (value: string) => void;
    onSend?: (value: string) => void;
    placeholder?: string;
    value?: string;
  }
</script>

<script lang="ts">
  export let className: MessageInputProps["className"] = "";
  export let disabled: MessageInputProps["disabled"] = false;
  export let onInput: MessageInputProps["onInput"] = undefined;
  export let onSend: MessageInputProps["onSend"] = undefined;
  export let value: MessageInputProps["value"] = "";
  export let placeholder: MessageInputProps["placeholder"] =
    "Type a message...";
</script>

<div class={`message-input ${className}`}>
  <textarea
    class="message-input__textarea"
    {disabled}
    on:input={(e) => {
      onInput?.(e.target.value);
    }}
    on:keydown={(e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend?.(value ?? "");
      }
    }}
    {placeholder}
    rows={1}
    {value}
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