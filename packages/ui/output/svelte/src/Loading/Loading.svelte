<script context="module" lang="ts">
  export interface LoadingProps {
    className?: string;
    label?: string;
    size?: "lg" | "md" | "sm";
  }
</script>

<script lang="ts">
  export let label: LoadingProps["label"] = "Loading...";
  export let size: LoadingProps["size"] = "md";
  export let className: LoadingProps["className"] = "";
</script>

<div
  role="status"
  aria-label={label}
  class={`loading loading--${size} ${className}`}
>
  <span class="loading__spinner" /><span class="loading__label">{label}</span>
</div>