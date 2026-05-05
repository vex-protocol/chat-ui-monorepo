import * as React from "react";

export interface StatusDotProps {
    className?: string;
    status?: StatusDotStatus;
}
export type StatusDotStatus = "away" | "dnd" | "offline" | "online";

function StatusDot(props: StatusDotProps) {
    props = { className: "", status: "offline", ...props };
    function color() {
        if (props.status === "online") return "#43a047";
        if (props.status === "away") return "#fb8c00";
        if (props.status === "dnd") return "#e53935";
        return "#666666";
    }

    return (
        <span
            aria-label={props.status}
            className={`status-dot ${props.className}`}
            style={{
                backgroundColor: color(),
                borderRadius: "50%",
                display: "inline-block",
                flexShrink: "0",
                height: "8px",
                width: "8px",
            }}
        />
    );
}

export default StatusDot;
