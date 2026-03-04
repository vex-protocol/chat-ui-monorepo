<script context="module" lang="ts">
  export interface ServerListItemProps {
    name?: string;
    avatarUrl?: string;
    isActive?: boolean;
    className?: string;
    onClick?: () => void;
  }
</script>

<script lang="ts">
  export let isActive: ServerListItemProps["isActive"] = false;
  export let className: ServerListItemProps["className"] = "";
  export let name: ServerListItemProps["name"] = "";
  export let onClick: ServerListItemProps["onClick"] = undefined;
  export let avatarUrl: ServerListItemProps["avatarUrl"] = "";
</script>

<button
  type="button"
  class={`server-list-item ${
    isActive ? "server-list-item--active" : ""
  } ${className}`}
  title={name}
  on:click={(event) => {
    onClick?.();
  }}
  ><img
    class="server-list-item__avatar"
    src={avatarUrl}
    alt={name}
    on:error={(e) => {
      e.currentTarget.style.display = "none";
    }}
  /><span class="server-list-item__initial">
    {#if name}
      {name[0]}
    {:else}
      <div _text="" />
    {/if}</span
  ></button
>