"use client";
import * as React from "react";

export interface SearchBarProps {
    className?: string;
    onInput?: (value: string) => void;
    placeholder?: string;
    value?: string;
}

function SearchBar(props: SearchBarProps) {
    props = { className: "", placeholder: "Search...", value: "", ...props };
    return (
        <div className={`search-bar ${props.className}`}>
            <span aria-hidden="true" className="search-bar__icon">
                🔍
            </span>
            <input
                className="search-bar__input"
                type="search"
                onInput={(e) => props.onInput?.(e.target.value)}
                placeholder={props.placeholder}
                value={props.value}
            />
        </div>
    );
}

export default SearchBar;
