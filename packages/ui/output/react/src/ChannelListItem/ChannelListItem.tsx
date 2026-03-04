"use client";
import * as React from "react";

export interface ChannelListItemProps {
  name?: string;
  unreadCount?: number;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
}

function ChannelListItem(props: ChannelListItemProps) {
  props = {
    name: "",
    unreadCount: 0,
    isActive: false,
    className: "",
    ...props,
  };
  return (
    <button
      type="button"
      className={`channel-list-item ${
        props.isActive ? "channel-list-item--active" : ""
      } ${props.className}`}
      onClick={(event) => props.onClick?.()}
    >
      <span className="channel-list-item__prefix">#</span>
      <span className="channel-list-item__name">{props.name}</span>
      <span className="channel-list-item__badge">{props.unreadCount}</span>
    </button>
  );
}

export default ChannelListItem;
