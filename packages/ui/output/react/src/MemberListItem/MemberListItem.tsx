import * as React from "react";

export interface MemberListItemProps {
  userID: string;
  username?: string;
  avatarSrc?: string;
  status?: StatusDotStatus;
  className?: string;
}

import Avatar from "../Avatar/Avatar";
import StatusDot from "../StatusDot/StatusDot";
import type { StatusDotStatus } from "../StatusDot/StatusDot";

function MemberListItem(props: MemberListItemProps) {
  props = { username: "", status: "offline", className: "", ...props };
  return (
    <div
      className={`member-list-item ${props.className}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "4px 8px",
        borderRadius: "4px",
      }}
    >
      <Avatar
        userID={props.userID}
        src={props.avatarSrc}
        size={24}
        displayName={props.username}
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
