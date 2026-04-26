export const colors = {
    accent: "#e70000",
    accentDark: "#8B0000",
    accentMuted: "#ff6b6b",
    bg: "#09090b",
    border: "#3f3f46",
    borderSubtle: "#27272a",
    card: "#111113",
    error: "#e53935",
    input: "#18181b",
    muted: "#a1a1aa",
    mutedDark: "#71717a",
    surface: "#111113",
    surfaceLight: "#18181b",
    text: "#f5f5f5",
    textSecondary: "#e4e4e7",
    transparent: "transparent",
} as const;

export type ColorToken = keyof typeof colors;
