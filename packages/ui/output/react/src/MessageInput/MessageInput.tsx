"use client";
import * as React from "react";

export interface MessageInputProps {
  value?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onInput?: (value: string) => void;
  onSend?: (value: string) => void;
}

function MessageInput(props: MessageInputProps) {
  props = {
    value: "",
    placeholder: "Type a message...",
    disabled: false,
    className: "",
    ...props,
  };
  return (
    <div className={`message-input ${props.className}`}>
      <textarea
        className="message-input__textarea"
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        rows={1}
        onInput={(e) => props.onInput?.(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            props.onSend?.(props.value ?? "");
          }
        }}
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
