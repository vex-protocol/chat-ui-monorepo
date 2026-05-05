<script context="module" lang="ts">
  export interface ButtonProps {
    children?: any;
    className?: string;
    disabled?: boolean;
    onClick?: (event: MouseEvent) => void;
    size?: "lg" | "md" | "sm";
    type?: "button" | "reset" | "submit";
    variant?: "ghost" | "primary" | "secondary";
  }
</script>

<script lang="ts">
  export let variant: ButtonProps["variant"] = "primary";
  export let size: ButtonProps["size"] = "md";
  export let className: ButtonProps["className"] = "";
  export let disabled: ButtonProps["disabled"] = false;
  export let onClick: ButtonProps["onClick"] = undefined;
  export let type: ButtonProps["type"] = "button";
</script>

<button
  class={`btn btn--${variant} btn--${size} ${className}`}
  {disabled}
  on:click={(event) => {
    onClick?.(event);
  }}
  {type}><slot /></button
>