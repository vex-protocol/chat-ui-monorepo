<script context="module" lang="ts">
  export interface MemberListItemProps {
    userID: string;
    username?: string;
    avatarSrc?: string;
    status?: StatusDotStatus;
    className?: string;
  }
</script>

<script lang="ts">
  import Avatar from "../Avatar/Avatar.svelte";
  import StatusDot from "../StatusDot/StatusDot.svelte";
  import type { StatusDotStatus } from "../StatusDot/StatusDot.svelte";

  export let className: MemberListItemProps["className"] = "";
  export let userID: MemberListItemProps["userID"];
  export let avatarSrc: MemberListItemProps["avatarSrc"] = undefined;
  export let username: MemberListItemProps["username"] = "";
  export let status: MemberListItemProps["status"] = "offline";
  function stringifyStyles(stylesObj) {
    let styles = "";
    for (let key in stylesObj) {
      const dashedKey = key.replace(/[A-Z]/g, function (match) {
        return "-" + match.toLowerCase();
      });
      styles += dashedKey + ":" + stylesObj[key] + ";";
    }
    return styles;
  }
</script>

<div
  style={stringifyStyles({
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "4px 8px",
    borderRadius: "4px",
  })}
  class={`member-list-item ${className}`}
>
  <Avatar {userID} src={avatarSrc} size={24} displayName={username} /><StatusDot
    {status}
  /><span
    style={stringifyStyles({
      fontSize: "13px",
      overflow: "hidden",
      textOverflow: "ellipsis",
      whiteSpace: "nowrap",
    })}
    class="member-list-item__name">{username || userID}</span
  >
</div>