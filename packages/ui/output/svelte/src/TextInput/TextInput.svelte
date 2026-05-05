<script context="module" lang="ts">
  export interface TextInputProps {
    className?: string;
    disabled?: boolean;
    label?: string;
    onChange?: (value: string) => void;
    onInput?: (value: string) => void;
    placeholder?: string;
    type?: "email" | "password" | "search" | "text";
    value?: string;
  }
</script>

<script lang="ts">
  export let className: TextInputProps["className"] = "";
  export let label: TextInputProps["label"] = "";
  export let disabled: TextInputProps["disabled"] = false;
  export let onChange: TextInputProps["onChange"] = undefined;
  export let onInput: TextInputProps["onInput"] = undefined;
  export let placeholder: TextInputProps["placeholder"] = "";
  export let type: TextInputProps["type"] = "text";
  export let value: TextInputProps["value"] = "";
</script>

<div class={`text-input ${className}`}>
  <label class="text-input__label">{label}</label><input
    class="text-input__field"
    {disabled}
    on:change={(e) => {
      onChange?.(e.target.value);
    }}
    on:input={(e) => {
      onInput?.(e.target.value);
    }}
    {placeholder}
    {type}
    {value}
  />
</div>