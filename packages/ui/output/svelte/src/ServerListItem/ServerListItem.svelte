<script context="module" lang="ts">
  export interface ServerListItemProps {
    avatarUrl?: string;
    className?: string;
    isActive?: boolean;
    name?: string;
    onClick?: () => void;
  }
</script>

<script lang="ts">
  export let isActive: ServerListItemProps["isActive"] = false;
  export let className: ServerListItemProps["className"] = "";
  export let onClick: ServerListItemProps["onClick"] = undefined;
  export let name: ServerListItemProps["name"] = "";
  export let avatarUrl: ServerListItemProps["avatarUrl"] = "";
</script>

<button
  type="button"
  class={`server-list-item ${
    isActive ? "server-list-item--active" : ""
  } ${className}`}
  on:click={(event) => {
    onClick?.();
  }}
  title={name}
  ><img
    class="server-list-item__avatar"
    alt={name}
    on:error={(e) => {
      e.currentTarget.style.display = "none";
    }}
    src={avatarUrl}
  /><span class="server-list-item__initial">
    {#if name}
      {name[0]}
    {:else}
      <div _text="" />
    {/if}</span
  ></button
>