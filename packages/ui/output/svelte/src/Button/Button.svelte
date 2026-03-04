<script context="module" lang="ts">
  export interface ButtonProps {
    variant?: "primary" | "secondary" | "ghost";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
    className?: string;
    onClick?: (event: MouseEvent) => void;
    children?: any;
  }
</script>

<script lang="ts">
  export let variant: ButtonProps["variant"] = "primary";
  export let size: ButtonProps["size"] = "md";
  export let className: ButtonProps["className"] = "";
  export let disabled: ButtonProps["disabled"] = false;
  export let type: ButtonProps["type"] = "button";
  export let onClick: ButtonProps["onClick"] = undefined;
</script>

<button
  class={`btn btn--${variant} btn--${size} ${className}`}
  {disabled}
  {type}
  on:click={(event) => {
    onClick?.(event);
  }}><slot /></button
>