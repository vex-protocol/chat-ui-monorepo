<script context="module" lang="ts">
  export interface ChannelListItemProps {
    className?: string;
    isActive?: boolean;
    name?: string;
    onClick?: () => void;
    unreadCount?: number;
  }
</script>

<script lang="ts">
  export let isActive: ChannelListItemProps["isActive"] = false;
  export let className: ChannelListItemProps["className"] = "";
  export let onClick: ChannelListItemProps["onClick"] = undefined;
  export let name: ChannelListItemProps["name"] = "";
  export let unreadCount: ChannelListItemProps["unreadCount"] = 0;
</script>

<button
  type="button"
  class={`channel-list-item ${
    isActive ? "channel-list-item--active" : ""
  } ${className}`}
  on:click={(event) => {
    onClick?.();
  }}
  ><span class="channel-list-item__prefix">#</span><span
    class="channel-list-item__name">{name}</span
  ><span class="channel-list-item__badge">{unreadCount}</span></button
>