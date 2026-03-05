<script context="module" lang="ts">
  export interface MessageChunkProps {
    authorID: string;
    authorName?: string;
    avatarSrc?: string;
    timestamp?: string;
    messages?: string[];
    isSelf?: boolean;
    avatarSize?: number;
    className?: string;
  }
</script>

<script lang="ts">
  import Avatar from "../Avatar/Avatar.svelte";

  export let authorName: MessageChunkProps["authorName"] = undefined;
  export let authorID: MessageChunkProps["authorID"];
  export let className: MessageChunkProps["className"] = "";
  export let avatarSrc: MessageChunkProps["avatarSrc"] = undefined;
  export let avatarSize: MessageChunkProps["avatarSize"] = 36;
  export let isSelf: MessageChunkProps["isSelf"] = false;
  export let timestamp: MessageChunkProps["timestamp"] = "";
  export let messages: MessageChunkProps["messages"] = [];
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

  $: displayName = () => {
    return authorName || (authorID ? authorID.slice(0, 8) : "");
  };
</script>

<div
  style={stringifyStyles({
    display: "flex",
    gap: "10px",
    padding: "4px 0",
  })}
  class={`message-chunk ${className}`}
>
  <Avatar
    userID={authorID}
    src={avatarSrc}
    size={avatarSize}
    displayName={authorName}
  />
  <div
    style={stringifyStyles({
      flex: "1",
      minWidth: "0",
    })}
    class="message-chunk__body"
  >
    <div
      style={stringifyStyles({
        display: "flex",
        alignItems: "baseline",
        gap: "8px",
        marginBottom: "2px",
      })}
      class="message-chunk__header"
    >
      <span
        style={stringifyStyles({
          fontWeight: "600",
          fontSize: "14px",
        })}
        class={`message-chunk__author ${
          isSelf ? "message-chunk__author--self" : ""
        }`}>{displayName()}</span
      ><time
        style={stringifyStyles({
          fontSize: "11px",
          opacity: "0.5",
        })}
        class="message-chunk__time">{timestamp}</time
      >
    </div>
    {#each messages as message}
      <div
        style={stringifyStyles({
          fontSize: "14px",
          lineHeight: "1.5",
          paddingTop: "1px",
          wordBreak: "break-word",
        })}
        class="message-chunk__line"
      >
        {@html message}
      </div>
    {/each}
  </div>
</div>