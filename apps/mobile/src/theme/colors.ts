export const colors = {
    accent: "#e70000",
    accentDark: "#800000",
    accentMuted: "#cc2a2a",
    bg: "#010101",
    border: "#333333",
    borderSubtle: "#2a2a2a",
    card: "#141414",
    error: "#e53935",
    input: "#242424",
    muted: "#737373",
    mutedDark: "#666666",
    surface: "#131313",
    surfaceLight: "#1a1a1a",
    text: "#fafafa",
    textSecondary: "#e8e8e8",
    transparent: "transparent",
} as const;

export type ColorToken = keyof typeof colors;
