import * as React from "react";

export interface MessageBubbleProps {
    author?: string;
    className?: string;
    content?: string;
    isOwn?: boolean;
    timestamp?: string;
}

function MessageBubble(props: MessageBubbleProps) {
    props = {
        author: "",
        className: "",
        content: "",
        isOwn: false,
        timestamp: "",
        ...props,
    };
    return (
        <div
            className={`message-bubble ${props.isOwn ? "message-bubble--own" : ""} ${
                props.className
            }`}
        >
            <span className="message-bubble__author">{props.author}</span>
            <p className="message-bubble__content">{props.content}</p>
            <time className="message-bubble__timestamp">{props.timestamp}</time>
        </div>
    );
}

export default MessageBubble;
