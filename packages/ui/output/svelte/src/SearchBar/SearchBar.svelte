<script context="module" lang="ts">
  export interface SearchBarProps {
    value?: string;
    placeholder?: string;
    className?: string;
    onInput?: (value: string) => void;
  }
</script>

<script lang="ts">
  export let className: SearchBarProps["className"] = "";
  export let value: SearchBarProps["value"] = "";
  export let placeholder: SearchBarProps["placeholder"] = "Search...";
  export let onInput: SearchBarProps["onInput"] = undefined;
</script>

<div class={`search-bar ${className}`}>
  <span class="search-bar__icon" aria-hidden="true"> 🔍 </span><input
    class="search-bar__input"
    type="search"
    {value}
    {placeholder}
    on:input={(e) => {
      onInput?.(e.target.value);
    }}
  />
</div>