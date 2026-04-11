import { Platform, type TextStyle } from "react-native";

export const fontFamilies = {
    body:
        Platform.select({ android: "Inter-Medium", ios: "Inter-Medium" }) ??
        "Inter-Medium",
    heading:
        Platform.select({
            android: "SpaceGrotesk-Medium",
            ios: "SpaceGrotesk-Medium",
        }) ?? "SpaceGrotesk-Medium",
    mono:
        Platform.select({
            android: "ChivoMono-Light",
            ios: "ChivoMono-Light",
        }) ?? "ChivoMono-Light",
} as const;

export const typography = {
    body: {
        fontFamily: fontFamilies.mono,
        fontSize: 12,
        fontWeight: "300",
        lineHeight: 18,
    } satisfies TextStyle,

    bodyLarge: {
        fontFamily: fontFamilies.mono,
        fontSize: 14,
        fontWeight: "300",
        lineHeight: 20,
    } satisfies TextStyle,

    button: {
        fontFamily: fontFamilies.body,
        fontSize: 14,
        fontWeight: "500",
        lineHeight: 20,
    } satisfies TextStyle,

    heading: {
        fontFamily: fontFamilies.heading,
        fontSize: 40,
        fontWeight: "500",
        lineHeight: 48,
    } satisfies TextStyle,

    headingSmall: {
        fontFamily: fontFamilies.heading,
        fontSize: 28,
        fontWeight: "500",
        lineHeight: 34,
    } satisfies TextStyle,

    label: {
        fontFamily: fontFamilies.mono,
        fontSize: 12,
        fontWeight: "300",
        letterSpacing: 1.5,
        lineHeight: 16,
        textTransform: "uppercase",
    } satisfies TextStyle,
} as const;

export type TypographyPreset = keyof typeof typography;
