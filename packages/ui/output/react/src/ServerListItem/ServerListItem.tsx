"use client";
import * as React from "react";

export interface ServerListItemProps {
    avatarUrl?: string;
    className?: string;
    isActive?: boolean;
    name?: string;
    onClick?: () => void;
}

function ServerListItem(props: ServerListItemProps) {
    props = {
        avatarUrl: "",
        className: "",
        isActive: false,
        name: "",
        ...props,
    };
    return (
        <button
            type="button"
            className={`server-list-item ${
                props.isActive ? "server-list-item--active" : ""
            } ${props.className}`}
            onClick={(event) => props.onClick?.()}
            title={props.name}
        >
            <img
                className="server-list-item__avatar"
                alt={props.name}
                onError={(e) => {
                    e.currentTarget.style.display = "none";
                }}
                src={props.avatarUrl}
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
