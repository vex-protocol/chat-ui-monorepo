import { useDefaultProps } from "@builder.io/mitosis";

export interface ChannelListItemProps {
    className?: string;
    isActive?: boolean;
    name?: string;
    onClick?: () => void;
    unreadCount?: number;
}

export default function ChannelListItem(props: ChannelListItemProps) {
    useDefaultProps<ChannelListItemProps>({
        className: "",
        isActive: false,
        name: "",
        unreadCount: 0,
    });

    return (
        <button
            class={`channel-list-item ${props.isActive ? "channel-list-item--active" : ""} ${props.className}`}
            onClick={() => props.onClick?.()}
            type="button"
        >
            <span class="channel-list-item__prefix">#</span>
            <span class="channel-list-item__name">{props.name}</span>
            <span class="channel-list-item__badge">{props.unreadCount}</span>
        </button>
    );
}
