<script context="module" lang="ts">
  export interface AvatarProps {
    src?: string;
    alt?: string;
    size?: "xs" | "sm" | "md" | "lg";
    initials?: string;
    className?: string;
  }
</script>

<script lang="ts">
  export let size: AvatarProps["size"] = "md";
  export let className: AvatarProps["className"] = "";
  export let src: AvatarProps["src"] = undefined;
  export let alt: AvatarProps["alt"] = "";
  export let initials: AvatarProps["initials"] = "?";
</script>

<div class={`avatar avatar--${size} ${className}`}>
  <img
    class="avatar__img"
    {src}
    {alt}
    on:error={(e) => {
      e.currentTarget.style.display = "none";
    }}
  /><span class="avatar__fallback">{initials}</span>
</div>