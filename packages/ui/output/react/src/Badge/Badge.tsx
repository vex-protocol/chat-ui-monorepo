import * as React from "react";

export interface BadgeProps {
    className?: string;
    label?: string;
    variant?: "dnd" | "idle" | "offline" | "online";
}

function Badge(props: BadgeProps) {
    props = { className: "", label: "", variant: "offline", ...props };
    return (
        <span
            aria-label={props.label}
            className={`badge badge--${props.variant} ${props.className}`}
            title={props.label}
        />
    );
}

export default Badge;
