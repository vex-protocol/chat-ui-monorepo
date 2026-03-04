<script context="module" lang="ts">
  export interface LoadingProps {
    size?: "sm" | "md" | "lg";
    label?: string;
    className?: string;
  }
</script>

<script lang="ts">
  export let size: LoadingProps["size"] = "md";
  export let className: LoadingProps["className"] = "";
  export let label: LoadingProps["label"] = "Loading...";
</script>

<div
  role="status"
  class={`loading loading--${size} ${className}`}
  aria-label={label}
>
  <span class="loading__spinner" /><span class="loading__label">{label}</span>
</div>