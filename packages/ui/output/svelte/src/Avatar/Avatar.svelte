<script context="module" lang="ts">
  export interface AvatarProps {
    src?: string;
    alt?: string;
    size?: "xs" | "sm" | "md" | "lg" | number;
    userID?: string;
    displayName?: string;
    className?: string;
  }
</script>

<script lang="ts">
  export let size: AvatarProps["size"] = "md";
  export let displayName: AvatarProps["displayName"] = undefined;
  export let userID: AvatarProps["userID"] = undefined;
  export let className: AvatarProps["className"] = "";
  export let src: AvatarProps["src"] = undefined;
  export let alt: AvatarProps["alt"] = "";
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

  function handleError() {
    imgFailed = true;
  }
  $: px = () => {
    const s = size;
    if (typeof s === "number") return s;
    if (s === "xs") return 20;
    if (s === "sm") return 28;
    if (s === "lg") return 48;
    return 36;
  };
  $: initials = () => {
    if (displayName) return displayName.slice(0, 2).toUpperCase();
    if (userID) return userID.slice(0, 2).toUpperCase();
    return "?";
  };
  $: fallbackBg = () => {
    const id = userID;
    if (!id) return "hsl(0, 0%, 40%)";
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return `hsl(${Math.abs(h) % 360}, 45%, 40%)`;
  };

  let imgFailed = false;
</script>

<div
  style={stringifyStyles({
    width: `${px()}px`,
    height: `${px()}px`,
    borderRadius: "50%",
    flexShrink: "0",
    display: "inline-flex",
    overflow: "hidden",
  })}
  class={`avatar ${className}`}
>
  {#if src && !imgFailed}
    <img
      style={stringifyStyles({
        width: "100%",
        height: "100%",
        objectFit: "cover",
        borderRadius: "50%",
      })}
      class="avatar__img"
      {src}
      {alt}
      width={px()}
      height={px()}
      on:error={(event) => {
        handleError();
      }}
    />
  {:else}
    <div
      style={stringifyStyles({
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: fallbackBg(),
        color: "#fff",
        fontWeight: "700",
        fontSize: `${Math.round(px() * 0.4)}px`,
        letterSpacing: "0.02em",
        userSelect: "none",
        borderRadius: "50%",
      })}
      class="avatar__fallback"
    >
      {initials()}
    </div>
  {/if}
</div>