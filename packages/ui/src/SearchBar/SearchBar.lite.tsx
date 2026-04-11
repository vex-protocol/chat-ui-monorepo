import { useDefaultProps } from "@builder.io/mitosis";

export interface SearchBarProps {
    className?: string;
    onInput?: (value: string) => void;
    placeholder?: string;
    value?: string;
}

export default function SearchBar(props: SearchBarProps) {
    useDefaultProps<SearchBarProps>({
        className: "",
        placeholder: "Search...",
        value: "",
    });

    return (
        <div class={`search-bar ${props.className}`}>
            <span aria-hidden="true" class="search-bar__icon">
                🔍
            </span>
            <input
                class="search-bar__input"
                onInput={(e: any) => props.onInput?.(e.target.value)}
                placeholder={props.placeholder}
                type="search"
                value={props.value}
            />
        </div>
    );
}
