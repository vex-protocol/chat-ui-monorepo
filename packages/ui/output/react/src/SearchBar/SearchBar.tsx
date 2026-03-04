"use client";
import * as React from "react";

export interface SearchBarProps {
  value?: string;
  placeholder?: string;
  className?: string;
  onInput?: (value: string) => void;
}

function SearchBar(props: SearchBarProps) {
  props = { value: "", placeholder: "Search...", className: "", ...props };
  return (
    <div className={`search-bar ${props.className}`}>
      <span className="search-bar__icon" aria-hidden="true">
        🔍
      </span>
      <input
        className="search-bar__input"
        type="search"
        value={props.value}
        placeholder={props.placeholder}
        onInput={(e) => props.onInput?.(e.target.value)}
      />
    </div>
  );
}

export default SearchBar;
