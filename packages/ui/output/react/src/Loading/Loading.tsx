import * as React from "react";

export interface LoadingProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

function Loading(props: LoadingProps) {
  props = { size: "md", label: "Loading...", className: "", ...props };
  return (
    <div
      role="status"
      className={`loading loading--${props.size} ${props.className}`}
      aria-label={props.label}
    >
      <span className="loading__spinner" />
      <span className="loading__label">{props.label}</span>
    </div>
  );
}

export default Loading;
