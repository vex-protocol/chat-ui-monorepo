import * as React from "react";

export type StatusDotStatus = "online" | "away" | "offline" | "dnd";
export interface StatusDotProps {
  status?: StatusDotStatus;
  className?: string;
}

function StatusDot(props: StatusDotProps) {
  props = { status: "offline", className: "", ...props };
  function color() {
    if (props.status === "online") return "#43a047";
    if (props.status === "away") return "#fb8c00";
    if (props.status === "dnd") return "#e53935";
    return "#666666";
  }

  return (
    <span
      className={`status-dot ${props.className}`}
      style={{
        display: "inline-block",
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        backgroundColor: color(),
        flexShrink: "0",
      }}
      aria-label={props.status}
    />
  );
}

export default StatusDot;
