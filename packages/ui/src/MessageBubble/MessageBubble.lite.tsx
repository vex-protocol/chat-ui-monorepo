import { useDefaultProps } from "@builder.io/mitosis";

export interface MessageBubbleProps {
    author?: string;
    className?: string;
    content?: string;
    isOwn?: boolean;
    timestamp?: string;
}

export default function MessageBubble(props: MessageBubbleProps) {
    useDefaultProps<MessageBubbleProps>({
        author: "",
        className: "",
        content: "",
        isOwn: false,
        timestamp: "",
    });

    return (
        <div
            class={`message-bubble ${props.isOwn ? "message-bubble--own" : ""} ${props.className}`}
        >
            <span class="message-bubble__author">{props.author}</span>
            <p class="message-bubble__content">{props.content}</p>
            <time class="message-bubble__timestamp">{props.timestamp}</time>
        </div>
    );
}
