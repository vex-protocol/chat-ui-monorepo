import { Platform, TextStyle } from "react-native";

export const fontFamilies = {
    heading: Platform.select({
        ios: "SpaceGrotesk-Medium",
        android: "SpaceGrotesk-Medium",
    })!,
    mono: Platform.select({
        ios: "ChivoMono-Light",
        android: "ChivoMono-Light",
    })!,
    body: Platform.select({ ios: "Inter-Medium", android: "Inter-Medium" })!,
} as const;

export const typography = {
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
        lineHeight: 16,
        textTransform: "uppercase",
        letterSpacing: 1.5,
    } satisfies TextStyle,

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
} as const;

export type TypographyPreset = keyof typeof typography;
