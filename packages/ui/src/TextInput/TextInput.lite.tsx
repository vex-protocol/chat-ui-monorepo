import { useDefaultProps } from "@builder.io/mitosis";

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

export default function TextInput(props: TextInputProps) {
    useDefaultProps<TextInputProps>({
        className: "",
        disabled: false,
        label: "",
        placeholder: "",
        type: "text",
        value: "",
    });

    return (
        <div class={`text-input ${props.className}`}>
            <label class="text-input__label">{props.label}</label>
            <input
                class="text-input__field"
                disabled={props.disabled}
                onChange={(e: any) => props.onChange?.(e.target.value)}
                onInput={(e: any) => props.onInput?.(e.target.value)}
                placeholder={props.placeholder}
                type={props.type}
                value={props.value}
            />
        </div>
    );
}
