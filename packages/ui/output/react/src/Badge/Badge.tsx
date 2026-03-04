import * as React from "react";

export interface BadgeProps {
  variant?: "online" | "offline" | "dnd" | "idle";
  label?: string;
  className?: string;
}

function Badge(props: BadgeProps) {
  props = { variant: "offline", label: "", className: "", ...props };
  return (
    <span
      className={`badge badge--${props.variant} ${props.className}`}
      aria-label={props.label}
      title={props.label}
    />
  );
}

export default Badge;
