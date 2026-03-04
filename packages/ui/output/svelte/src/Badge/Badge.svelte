<script context="module" lang="ts">
  export interface BadgeProps {
    variant?: "online" | "offline" | "dnd" | "idle";
    label?: string;
    className?: string;
  }
</script>

<script lang="ts">
  export let variant: BadgeProps["variant"] = "offline";
  export let className: BadgeProps["className"] = "";
  export let label: BadgeProps["label"] = "";
</script>

<span
  class={`badge badge--${variant} ${className}`}
  aria-label={label}
  title={label}
/>