import { useDefaultProps } from "@builder.io/mitosis";

export interface ServerListItemProps {
    avatarUrl?: string;
    className?: string;
    isActive?: boolean;
    name?: string;
    onClick?: () => void;
}

export default function ServerListItem(props: ServerListItemProps) {
    useDefaultProps<ServerListItemProps>({
        avatarUrl: "",
        className: "",
        isActive: false,
        name: "",
    });

    return (
        <button
            class={`server-list-item ${props.isActive ? "server-list-item--active" : ""} ${props.className}`}
            onClick={() => props.onClick?.()}
            title={props.name}
            type="button"
        >
            <img
                alt={props.name}
                class="server-list-item__avatar"
                onError={(e: any) => {
                    e.currentTarget.style.display = "none";
                }}
                src={props.avatarUrl}
            />
            <span class="server-list-item__initial">
                {props.name ? props.name[0] : ""}
            </span>
        </button>
    );
}
