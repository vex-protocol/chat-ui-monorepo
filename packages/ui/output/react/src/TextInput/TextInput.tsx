"use client";
import * as React from "react";

export interface TextInputProps {
    className?: string;
    disabled?: boolean;
    label?: string;
    onChange?: (value: string) => void;
    onInput?: (value: string) => void;
    placeholder?: string;
    type?: "email" | "password" | "search" | "text";
    value?: string;
}

function TextInput(props: TextInputProps) {
    props = {
        className: "",
        disabled: false,
        label: "",
        placeholder: "",
        type: "text",
        value: "",
        ...props,
    };
    return (
        <div className={`text-input ${props.className}`}>
            <label className="text-input__label">{props.label}</label>
            <input
                className="text-input__field"
                disabled={props.disabled}
                onChange={(e) => props.onChange?.(e.target.value)}
                onInput={(e) => props.onInput?.(e.target.value)}
                placeholder={props.placeholder}
                type={props.type}
                value={props.value}
            />
        </div>
    );
}

export default TextInput;
