import { useDefaultProps } from "@builder.io/mitosis";

export interface ButtonProps {
    children?: any;
    className?: string;
    disabled?: boolean;
    onClick?: (event: MouseEvent) => void;
    size?: "lg" | "md" | "sm";
    type?: "button" | "reset" | "submit";
    variant?: "ghost" | "primary" | "secondary";
}

export default function Button(props: ButtonProps) {
    useDefaultProps<ButtonProps>({
        className: "",
        disabled: false,
        size: "md",
        type: "button",
        variant: "primary",
    });

    return (
        <button
            class={`btn btn--${props.variant} btn--${props.size} ${props.className}`}
            disabled={props.disabled}
            onClick={(event) => props.onClick?.(event)}
            type={props.type}
        >
            {props.children}
        </button>
    );
}
