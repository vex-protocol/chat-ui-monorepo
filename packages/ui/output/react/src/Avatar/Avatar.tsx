"use client";
import * as React from "react";

export interface AvatarProps {
  src?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg";
  initials?: string;
  className?: string;
}

function Avatar(props: AvatarProps) {
  props = { size: "md", alt: "", initials: "?", className: "", ...props };
  return (
    <div className={`avatar avatar--${props.size} ${props.className}`}>
      <img
        className="avatar__img"
        src={props.src}
        alt={props.alt}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <span className="avatar__fallback">{props.initials}</span>
    </div>
  );
}

export default Avatar;
