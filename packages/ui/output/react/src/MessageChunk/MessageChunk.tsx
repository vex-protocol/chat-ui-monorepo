import * as React from "react";

export interface MessageChunkProps {
    authorID: string;
    authorName?: string;
    avatarSize?: number;
    avatarSrc?: string;
    className?: string;
    isSelf?: boolean;
    messages?: string[];
    timestamp?: string;
}

import Avatar from "../Avatar/Avatar";

function MessageChunk(props: MessageChunkProps) {
    props = {
        authorID: "",
        avatarSize: 36,
        className: "",
        isSelf: false,
        messages: [],
        timestamp: "",
        ...props,
    };
    function displayName() {
        return (
            props.authorName ||
            (props.authorID ? props.authorID.slice(0, 8) : "")
        );
    }

    return (
        <div
            className={`message-chunk ${props.className}`}
            style={{
                display: "flex",
                gap: "10px",
                padding: "4px 0",
            }}
        >
            <Avatar
                displayName={props.authorName}
                size={props.avatarSize}
                src={props.avatarSrc}
                userID={props.authorID}
            />
            <div
                className="message-chunk__body"
                style={{
                    flex: "1",
                    minWidth: "0",
                }}
            >
                <div
                    className="message-chunk__header"
                    style={{
                        alignItems: "baseline",
                        display: "flex",
                        gap: "8px",
                        marginBottom: "2px",
                    }}
                >
                    <span
                        className={`message-chunk__author ${
                            props.isSelf ? "message-chunk__author--self" : ""
                        }`}
                        style={{
                            fontSize: "14px",
                            fontWeight: "600",
                        }}
                    >
                        {displayName()}
                    </span>
                    <time
                        className="message-chunk__time"
                        style={{
                            fontSize: "11px",
                            opacity: "0.5",
                        }}
                    >
                        {props.timestamp}
                    </time>
                </div>
                {props.messages?.map((message) => (
                    <div
                        className="message-chunk__line"
                        dangerouslySetInnerHTML={{ __html: message }}
                        style={{
                            fontSize: "14px",
                            lineHeight: "1.5",
                            paddingTop: "1px",
                            wordBreak: "break-word",
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

export default MessageChunk;
