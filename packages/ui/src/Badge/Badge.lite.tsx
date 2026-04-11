import { useDefaultProps } from "@builder.io/mitosis";

export interface BadgeProps {
    className?: string;
    label?: string;
    variant?: "dnd" | "idle" | "offline" | "online";
}

export default function Badge(props: BadgeProps) {
    useDefaultProps<BadgeProps>({
        className: "",
        label: "",
        variant: "offline",
    });

    return (
        <span
            aria-label={props.label}
            class={`badge badge--${props.variant} ${props.className}`}
            title={props.label}
        />
    );
}
