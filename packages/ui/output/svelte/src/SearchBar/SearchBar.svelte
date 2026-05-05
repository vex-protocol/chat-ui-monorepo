<script context="module" lang="ts">
  export interface SearchBarProps {
    className?: string;
    onInput?: (value: string) => void;
    placeholder?: string;
    value?: string;
  }
</script>

<script lang="ts">
  export let className: SearchBarProps["className"] = "";
  export let onInput: SearchBarProps["onInput"] = undefined;
  export let placeholder: SearchBarProps["placeholder"] = "Search...";
  export let value: SearchBarProps["value"] = "";
</script>

<div class={`search-bar ${className}`}>
  <span aria-hidden="true" class="search-bar__icon"> 🔍 </span><input
    class="search-bar__input"
    type="search"
    on:input={(e) => {
      onInput?.(e.target.value);
    }}
    {placeholder}
    {value}
  />
</div>