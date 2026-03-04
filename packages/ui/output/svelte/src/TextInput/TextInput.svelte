<script context="module" lang="ts">
  export interface TextInputProps {
    value?: string;
    placeholder?: string;
    type?: "text" | "password" | "email" | "search";
    label?: string;
    disabled?: boolean;
    className?: string;
    onInput?: (value: string) => void;
    onChange?: (value: string) => void;
  }
</script>

<script lang="ts">
  export let className: TextInputProps["className"] = "";
  export let label: TextInputProps["label"] = "";
  export let type: TextInputProps["type"] = "text";
  export let value: TextInputProps["value"] = "";
  export let placeholder: TextInputProps["placeholder"] = "";
  export let disabled: TextInputProps["disabled"] = false;
  export let onInput: TextInputProps["onInput"] = undefined;
  export let onChange: TextInputProps["onChange"] = undefined;
</script>

<div class={`text-input ${className}`}>
  <label class="text-input__label">{label}</label><input
    class="text-input__field"
    {type}
    {value}
    {placeholder}
    {disabled}
    on:input={(e) => {
      onInput?.(e.target.value);
    }}
    on:change={(e) => {
      onChange?.(e.target.value);
    }}
  />
</div>