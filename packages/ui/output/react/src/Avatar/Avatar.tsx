"use client";
import * as React from "react";
import { useState } from "react";

export interface AvatarProps {
    alt?: string;
    className?: string;
    displayName?: string;
    size?: "lg" | "md" | "sm" | "xs" | number;
    src?: string;
    userID?: string;
}

function Avatar(props: AvatarProps) {
    props = { alt: "", className: "", size: "md", ...props };
    function fallbackBg() {
        const id = props.userID;
        if (!id) return "hsl(0, 0%, 40%)";
        let h = 0;
        for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
        return `hsl(${Math.abs(h) % 360}, 45%, 40%)`;
    }

    function handleError() {
        setImgFailed(true);
    }

    const [imgFailed, setImgFailed] = useState(() => false);

    function initials() {
        if (props.displayName)
            return props.displayName.slice(0, 2).toUpperCase();
        if (props.userID) return props.userID.slice(0, 2).toUpperCase();
        return "?";
    }

    function px() {
        const s = props.size;
        if (typeof s === "number") return s;
        if (s === "xs") return 20;
        if (s === "sm") return 28;
        if (s === "lg") return 48;
        return 36;
    }

    return (
        <div
            className={`avatar ${props.className}`}
            style={{
                borderRadius: "50%",
                display: "inline-flex",
                flexShrink: "0",
                height: `${px()}px`,
                overflow: "hidden",
                width: `${px()}px`,
            }}
        >
            {props.src && !imgFailed ? (
                <img
                    className="avatar__img"
                    alt={props.alt}
                    height={px()}
                    onError={(event) => {
                        handleError();
                    }}
                    src={props.src}
                    style={{
                        borderRadius: "50%",
                        height: "100%",
                        objectFit: "cover",
                        width: "100%",
                    }}
                    width={px()}
                />
            ) : (
                <div
                    className="avatar__fallback"
                    style={{
                        alignItems: "center",
                        background: fallbackBg(),
                        borderRadius: "50%",
                        color: "#fff",
                        display: "flex",
                        fontSize: `${Math.round(px() * 0.4)}px`,
                        fontWeight: "700",
                        height: "100%",
                        justifyContent: "center",
                        letterSpacing: "0.02em",
                        userSelect: "none",
                        width: "100%",
                    }}
                >
                    {initials()}
                </div>
            )}
        </div>
    );
}

export default Avatar;
