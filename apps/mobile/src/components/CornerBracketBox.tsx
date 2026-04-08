import React from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { colors } from "../theme";

interface CornerBracketBoxProps {
    children: React.ReactNode;
    color?: string;
    size?: number;
    style?: ViewStyle;
    thickness?: number;
}

export function CornerBracketBox({
    children,
    color = colors.border,
    size = 12,
    style,
    thickness = 1,
}: CornerBracketBoxProps) {
    const bracketStyle = { borderColor: color, borderWidth: thickness };

    return (
        <View style={[styles.container, style]}>
            {/* Top-left */}
            <View
                style={[
                    styles.corner,
                    styles.topLeft,
                    { height: size, width: size },
                    bracketStyle,
                    { borderBottomWidth: 0, borderRightWidth: 0 },
                ]}
            />
            {/* Top-right */}
            <View
                style={[
                    styles.corner,
                    styles.topRight,
                    { height: size, width: size },
                    bracketStyle,
                    { borderBottomWidth: 0, borderLeftWidth: 0 },
                ]}
            />
            {/* Bottom-left */}
            <View
                style={[
                    styles.corner,
                    styles.bottomLeft,
                    { height: size, width: size },
                    bracketStyle,
                    { borderRightWidth: 0, borderTopWidth: 0 },
                ]}
            />
            {/* Bottom-right */}
            <View
                style={[
                    styles.corner,
                    styles.bottomRight,
                    { height: size, width: size },
                    bracketStyle,
                    { borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
            />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    bottomLeft: {
        bottom: 0,
        left: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
    },
    container: {
        position: "relative",
    },
    corner: {
        position: "absolute",
        zIndex: 1,
    },
    topLeft: {
        left: 0,
        top: 0,
    },
    topRight: {
        right: 0,
        top: 0,
    },
});
