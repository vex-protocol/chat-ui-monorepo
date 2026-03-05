"use client";
import * as React from "react";
import { useState } from "react";

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | number;
  userID?: string;
  displayName?: string;
  className?: string;
}

function Avatar(props: AvatarProps) {
  props = { size: "md", alt: "", className: "", ...props };
  const [imgFailed, setImgFailed] = useState(() => false);

  function px() {
    const s = props.size;
    if (typeof s === "number") return s;
    if (s === "xs") return 20;
    if (s === "sm") return 28;
    if (s === "lg") return 48;
    return 36;
  }

  function initials() {
    if (props.displayName) return props.displayName.slice(0, 2).toUpperCase();
    if (props.userID) return props.userID.slice(0, 2).toUpperCase();
    return "?";
  }

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

  return (
    <div
      className={`avatar ${props.className}`}
      style={{
        width: `${px()}px`,
        height: `${px()}px`,
        borderRadius: "50%",
        flexShrink: "0",
        display: "inline-flex",
        overflow: "hidden",
      }}
    >
      {props.src && !imgFailed ? (
        <img
          className="avatar__img"
          src={props.src}
          alt={props.alt}
          width={px()}
          height={px()}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "50%",
          }}
          onError={(event) => handleError()}
        />
      ) : (
        <div
          className="avatar__fallback"
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: fallbackBg(),
            color: "#fff",
            fontWeight: "700",
            fontSize: `${Math.round(px() * 0.4)}px`,
            letterSpacing: "0.02em",
            userSelect: "none",
            borderRadius: "50%",
          }}
        >
          {initials()}
        </div>
      )}
    </div>
  );
}

export default Avatar;
