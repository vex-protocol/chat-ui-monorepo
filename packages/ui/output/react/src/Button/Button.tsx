"use client";
import * as React from "react";

export interface ButtonProps {
    children?: any;
    className?: string;
    disabled?: boolean;
    onClick?: (event: MouseEvent) => void;
    size?: "lg" | "md" | "sm";
    type?: "button" | "reset" | "submit";
    variant?: "ghost" | "primary" | "secondary";
}

function Button(props: ButtonProps) {
    props = {
        className: "",
        disabled: false,
        size: "md",
        type: "button",
        variant: "primary",
        ...props,
    };
    return (
        <button
            className={`btn btn--${props.variant} btn--${props.size} ${props.className}`}
            disabled={props.disabled}
            onClick={(event) => props.onClick?.(event)}
            type={props.type}
        >
            {props.children}
        </button>
    );
}

export default Button;
