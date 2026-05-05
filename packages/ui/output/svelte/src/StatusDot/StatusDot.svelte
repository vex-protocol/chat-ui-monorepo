<script context="module" lang="ts">
  export interface StatusDotProps {
    className?: string;
    status?: StatusDotStatus;
  }

  export type StatusDotStatus = "away" | "dnd" | "offline" | "online";
</script>

<script lang="ts">
  export let status: StatusDotProps["status"] = "offline";
  export let className: StatusDotProps["className"] = "";
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

  $: color = () => {
    if (status === "online") return "#43a047";
    if (status === "away") return "#fb8c00";
    if (status === "dnd") return "#e53935";
    return "#666666";
  };
</script>

<span
  style={stringifyStyles({
    backgroundColor: color(),
    borderRadius: "50%",
    display: "inline-block",
    flexShrink: "0",
    height: "8px",
    width: "8px",
  })}
  aria-label={status}
  class={`status-dot ${className}`}
/>