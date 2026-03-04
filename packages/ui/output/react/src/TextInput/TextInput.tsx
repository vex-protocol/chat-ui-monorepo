"use client";
import * as React from "react";

export interface TextInputProps {
  value?: string;
  placeholder?: string;
  type?: "text" | "password" | "email" | "search";
  label?: string;
  disabled?: boolean;
  className?: string;
  onInput?: (value: string) => void;
  onChange?: (value: string) => void;
}

function TextInput(props: TextInputProps) {
  props = {
    value: "",
    placeholder: "",
    type: "text",
    label: "",
    disabled: false,
    className: "",
    ...props,
  };
  return (
    <div className={`text-input ${props.className}`}>
      <label className="text-input__label">{props.label}</label>
      <input
        className="text-input__field"
        type={props.type}
        value={props.value}
        placeholder={props.placeholder}
        disabled={props.disabled}
        onInput={(e) => props.onInput?.(e.target.value)}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    </div>
  );
}

export default TextInput;
