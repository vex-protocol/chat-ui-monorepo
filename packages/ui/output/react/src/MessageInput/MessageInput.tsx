"use client";
import * as React from "react";

export interface MessageInputProps {
    className?: string;
    disabled?: boolean;
    onInput?: (value: string) => void;
    onSend?: (value: string) => void;
    placeholder?: string;
    value?: string;
}

function MessageInput(props: MessageInputProps) {
    props = {
        className: "",
        disabled: false,
        placeholder: "Type a message...",
        value: "",
        ...props,
    };
    return (
        <div className={`message-input ${props.className}`}>
            <textarea
                className="message-input__textarea"
                disabled={props.disabled}
                onInput={(e) => props.onInput?.(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        props.onSend?.(props.value ?? "");
                    }
                }}
                placeholder={props.placeholder}
                rows={1}
                value={props.value}
            />
            <button
                className="message-input__send"
                type="button"
                disabled={props.disabled}
                onClick={(event) => props.onSend?.(props.value ?? "")}
            >
                Send
            </button>
        </div>
    );
}

export default MessageInput;
