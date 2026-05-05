import * as React from "react";

export interface MemberListItemProps {
    avatarSrc?: string;
    className?: string;
    status?: StatusDotStatus;
    userID: string;
    username?: string;
}

import type { StatusDotStatus } from "../StatusDot/StatusDot";
import Avatar from "../Avatar/Avatar";
import StatusDot from "../StatusDot/StatusDot";

function MemberListItem(props: MemberListItemProps) {
    props = {
        className: "",
        status: "offline",
        userID: "",
        username: "",
        ...props,
    };
    return (
        <div
            className={`member-list-item ${props.className}`}
            style={{
                alignItems: "center",
                borderRadius: "4px",
                display: "flex",
                gap: "8px",
                padding: "4px 8px",
            }}
        >
            <Avatar
                displayName={props.username}
                size={24}
                src={props.avatarSrc}
                userID={props.userID}
            />
            <StatusDot status={props.status} />
            <span
                className="member-list-item__name"
                style={{
                    fontSize: "13px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                }}
            >
                {props.username || props.userID}
            </span>
        </div>
    );
}

export default MemberListItem;
