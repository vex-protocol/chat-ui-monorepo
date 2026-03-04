"use client";
import * as React from "react";

export interface ServerListItemProps {
  name?: string;
  avatarUrl?: string;
  isActive?: boolean;
  className?: string;
  onClick?: () => void;
}

function ServerListItem(props: ServerListItemProps) {
  props = { name: "", avatarUrl: "", isActive: false, className: "", ...props };
  return (
    <button
      type="button"
      className={`server-list-item ${
        props.isActive ? "server-list-item--active" : ""
      } ${props.className}`}
      title={props.name}
      onClick={(event) => props.onClick?.()}
    >
      <img
        className="server-list-item__avatar"
        src={props.avatarUrl}
        alt={props.name}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <span className="server-list-item__initial">
        {props.name ? (
          <>{props.name[0]}</>
        ) : (
          <>
            <div _text="" />
          </>
        )}
      </span>
    </button>
  );
}

export default ServerListItem;
