import { useDefaultProps, useStore } from "@builder.io/mitosis";

export interface StatusDotProps {
    className?: string;
    status?: StatusDotStatus;
}

export type StatusDotStatus = "away" | "dnd" | "offline" | "online";

export default function StatusDot(props: StatusDotProps) {
    useDefaultProps<StatusDotProps>({
        className: "",
        status: "offline",
    });

    const state = useStore({
        get color(): string {
            if (props.status === "online") return "#43a047";
            if (props.status === "away") return "#fb8c00";
            if (props.status === "dnd") return "#e53935";
            return "#666666";
        },
    });

    return (
        <span
            aria-label={props.status}
            class={`status-dot ${props.className}`}
            style={{
                backgroundColor: state.color,
                borderRadius: "50%",
                display: "inline-block",
                flexShrink: "0",
                height: "8px",
                width: "8px",
            }}
        />
    );
}
