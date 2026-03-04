"use client";
import * as React from "react";

export interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  className?: string;
  onClick?: (event: MouseEvent) => void;
  children?: any;
}

function Button(props: ButtonProps) {
  props = {
    variant: "primary",
    size: "md",
    disabled: false,
    type: "button",
    className: "",
    ...props,
  };
  return (
    <button
      className={`btn btn--${props.variant} btn--${props.size} ${props.className}`}
      disabled={props.disabled}
      type={props.type}
      onClick={(event) => props.onClick?.(event)}
    >
      {props.children}
    </button>
  );
}

export default Button;
