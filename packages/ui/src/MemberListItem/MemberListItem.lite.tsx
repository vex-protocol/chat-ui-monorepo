import type { StatusDotStatus } from "../StatusDot/StatusDot.lite";

import { useDefaultProps } from "@builder.io/mitosis";

import Avatar from "../Avatar/Avatar.lite";
import StatusDot from "../StatusDot/StatusDot.lite";

export interface MemberListItemProps {
    avatarSrc?: string;
    className?: string;
    status?: StatusDotStatus;
    userID: string;
    username?: string;
}

export default function MemberListItem(props: MemberListItemProps) {
    useDefaultProps<MemberListItemProps>({
        className: "",
        status: "offline",
        userID: "",
        username: "",
    });

    return (
        <div
            class={`member-list-item ${props.className}`}
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
                class="member-list-item__name"
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
