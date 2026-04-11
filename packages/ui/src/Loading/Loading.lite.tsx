import { useDefaultProps } from "@builder.io/mitosis";

export interface LoadingProps {
    className?: string;
    label?: string;
    size?: "lg" | "md" | "sm";
}

export default function Loading(props: LoadingProps) {
    useDefaultProps<LoadingProps>({
        className: "",
        label: "Loading...",
        size: "md",
    });

    return (
        <div
            aria-label={props.label}
            class={`loading loading--${props.size} ${props.className}`}
            role="status"
        >
            <span class="loading__spinner" />
            <span class="loading__label">{props.label}</span>
        </div>
    );
}
