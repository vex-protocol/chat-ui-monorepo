<script context="module" lang="ts">
  export type StatusDotStatus = "online" | "away" | "offline" | "dnd";

  export interface StatusDotProps {
    status?: StatusDotStatus;
    className?: string;
  }
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
    display: "inline-block",
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    backgroundColor: color(),
    flexShrink: "0",
  })}
  class={`status-dot ${className}`}
  aria-label={status}
/>