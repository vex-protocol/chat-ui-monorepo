import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { colors } from "../theme";

interface CornerBracketBoxProps {
    children: React.ReactNode;
    size?: number;
    color?: string;
    thickness?: number;
    style?: ViewStyle;
}

export function CornerBracketBox({
    children,
    size = 12,
    color = colors.border,
    thickness = 1,
    style,
}: CornerBracketBoxProps) {
    const bracketStyle = { borderColor: color, borderWidth: thickness };

    return (
        <View style={[styles.container, style]}>
            {/* Top-left */}
            <View
                style={[
                    styles.corner,
                    styles.topLeft,
                    { width: size, height: size },
                    bracketStyle,
                    { borderRightWidth: 0, borderBottomWidth: 0 },
                ]}
            />
            {/* Top-right */}
            <View
                style={[
                    styles.corner,
                    styles.topRight,
                    { width: size, height: size },
                    bracketStyle,
                    { borderLeftWidth: 0, borderBottomWidth: 0 },
                ]}
            />
            {/* Bottom-left */}
            <View
                style={[
                    styles.corner,
                    styles.bottomLeft,
                    { width: size, height: size },
                    bracketStyle,
                    { borderRightWidth: 0, borderTopWidth: 0 },
                ]}
            />
            {/* Bottom-right */}
            <View
                style={[
                    styles.corner,
                    styles.bottomRight,
                    { width: size, height: size },
                    bracketStyle,
                    { borderLeftWidth: 0, borderTopWidth: 0 },
                ]}
            />
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: "relative",
    },
    corner: {
        position: "absolute",
        zIndex: 1,
    },
    topLeft: {
        top: 0,
        left: 0,
    },
    topRight: {
        top: 0,
        right: 0,
    },
    bottomLeft: {
        bottom: 0,
        left: 0,
    },
    bottomRight: {
        bottom: 0,
        right: 0,
    },
});
