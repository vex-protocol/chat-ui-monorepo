import * as React from "react";

export interface LoadingProps {
    className?: string;
    label?: string;
    size?: "lg" | "md" | "sm";
}

function Loading(props: LoadingProps) {
    props = { className: "", label: "Loading...", size: "md", ...props };
    return (
        <div
            role="status"
            aria-label={props.label}
            className={`loading loading--${props.size} ${props.className}`}
        >
            <span className="loading__spinner" />
            <span className="loading__label">{props.label}</span>
        </div>
    );
}

export default Loading;
