import { useDefaultProps } from "@builder.io/mitosis";

export interface MessageInputProps {
    className?: string;
    disabled?: boolean;
    onInput?: (value: string) => void;
    onSend?: (value: string) => void;
    placeholder?: string;
    value?: string;
}

export default function MessageInput(props: MessageInputProps) {
    useDefaultProps<MessageInputProps>({
        className: "",
        disabled: false,
        placeholder: "Type a message...",
        value: "",
    });

    return (
        <div class={`message-input ${props.className}`}>
            <textarea
                class="message-input__textarea"
                disabled={props.disabled}
                onInput={(e: any) => props.onInput?.(e.target.value)}
                onKeyDown={(e: any) => {
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
                class="message-input__send"
                disabled={props.disabled}
                onClick={() => props.onSend?.(props.value ?? "")}
                type="button"
            >
                Send
            </button>
        </div>
    );
}
