<script context="module" lang="ts">
  export interface BadgeProps {
    className?: string;
    label?: string;
    variant?: "dnd" | "idle" | "offline" | "online";
  }
</script>

<script lang="ts">
  export let label: BadgeProps["label"] = "";
  export let variant: BadgeProps["variant"] = "offline";
  export let className: BadgeProps["className"] = "";
</script>

<span
  aria-label={label}
  class={`badge badge--${variant} ${className}`}
  title={label}
/>