<script context="module" lang="ts">
  export interface AvatarProps {
    alt?: string;
    className?: string;
    displayName?: string;
    size?: "lg" | "md" | "sm" | "xs" | number;
    src?: string;
    userID?: string;
  }
</script>

<script lang="ts">
  export let userID: AvatarProps["userID"] = undefined;
  export let displayName: AvatarProps["displayName"] = undefined;
  export let size: AvatarProps["size"] = "md";
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
  $: fallbackBg = () => {
    const id = userID;
    if (!id) return "hsl(0, 0%, 40%)";
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return `hsl(${Math.abs(h) % 360}, 45%, 40%)`;
  };
  $: initials = () => {
    if (displayName) return displayName.slice(0, 2).toUpperCase();
    if (userID) return userID.slice(0, 2).toUpperCase();
    return "?";
  };
  $: px = () => {
    const s = size;
    if (typeof s === "number") return s;
    if (s === "xs") return 20;
    if (s === "sm") return 28;
    if (s === "lg") return 48;
    return 36;
  };

  let imgFailed = false;
</script>

<div
  style={stringifyStyles({
    borderRadius: "50%",
    display: "inline-flex",
    flexShrink: "0",
    height: `${px()}px`,
    overflow: "hidden",
    width: `${px()}px`,
  })}
  class={`avatar ${className}`}
>
  {#if src && !imgFailed}
    <img
      style={stringifyStyles({
        borderRadius: "50%",
        height: "100%",
        objectFit: "cover",
        width: "100%",
      })}
      class="avatar__img"
      {alt}
      height={px()}
      on:error={(event) => {
        handleError();
      }}
      {src}
      width={px()}
    />
  {:else}
    <div
      style={stringifyStyles({
        alignItems: "center",
        background: fallbackBg(),
        borderRadius: "50%",
        color: "#fff",
        display: "flex",
        fontSize: `${Math.round(px() * 0.4)}px`,
        fontWeight: "700",
        height: "100%",
        justifyContent: "center",
        letterSpacing: "0.02em",
        userSelect: "none",
        width: "100%",
      })}
      class="avatar__fallback"
    >
      {initials()}
    </div>
  {/if}
</div>