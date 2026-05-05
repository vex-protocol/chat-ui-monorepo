<script context="module" lang="ts">
  export interface MemberListItemProps {
    avatarSrc?: string;
    className?: string;
    status?: StatusDotStatus;
    userID: string;
    username?: string;
  }
</script>

<script lang="ts">
  import type { StatusDotStatus } from "../StatusDot/StatusDot.svelte";
  import Avatar from "../Avatar/Avatar.svelte";
  import StatusDot from "../StatusDot/StatusDot.svelte";

  export let className: MemberListItemProps["className"] = "";
  export let username: MemberListItemProps["username"] = "";
  export let avatarSrc: MemberListItemProps["avatarSrc"] = undefined;
  export let userID: MemberListItemProps["userID"] = "";
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
    alignItems: "center",
    borderRadius: "4px",
    display: "flex",
    gap: "8px",
    padding: "4px 8px",
  })}
  class={`member-list-item ${className}`}
>
  <Avatar displayName={username} size={24} src={avatarSrc} {userID} /><StatusDot
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