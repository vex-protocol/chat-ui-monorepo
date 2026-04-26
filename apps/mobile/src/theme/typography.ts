import { Platform, type TextStyle } from "react-native";

export const fontFamilies = {
    body: Platform.select({ android: "sans-serif", ios: "System" }) ?? "System",
    heading:
        Platform.select({ android: "sans-serif", ios: "System" }) ?? "System",
    mono:
        Platform.select({ android: "monospace", ios: "Menlo" }) ?? "monospace",
} as const;

export const typography = {
    body: {
        fontFamily: fontFamilies.body,
        fontSize: 12,
        fontWeight: "400",
        lineHeight: 18,
    } satisfies TextStyle,

    bodyLarge: {
        fontFamily: fontFamilies.body,
        fontSize: 14,
        fontWeight: "400",
        lineHeight: 20,
    } satisfies TextStyle,

    button: {
        fontFamily: fontFamilies.body,
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 20,
    } satisfies TextStyle,

    heading: {
        fontFamily: fontFamilies.heading,
        fontSize: 40,
        fontWeight: "700",
        lineHeight: 48,
    } satisfies TextStyle,

    headingSmall: {
        fontFamily: fontFamilies.heading,
        fontSize: 28,
        fontWeight: "700",
        lineHeight: 34,
    } satisfies TextStyle,

    label: {
        fontFamily: fontFamilies.body,
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 1.2,
        lineHeight: 16,
        textTransform: "uppercase",
    } satisfies TextStyle,
} as const;

export type TypographyPreset = keyof typeof typography;
