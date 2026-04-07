import React from "react";
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    type ViewStyle,
    ActivityIndicator,
} from "react-native";
import { colors, typography } from "../theme";
import { CornerBracketBox } from "./CornerBracketBox";

interface VexButtonProps {
    title: string;
    onPress: () => void;
    variant?: "primary" | "outline";
    glow?: boolean;
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
}

export function VexButton({
    title,
    onPress,
    variant = "primary",
    glow = false,
    loading = false,
    disabled = false,
    style,
}: VexButtonProps) {
    const isPrimary = variant === "primary";

    return (
        <CornerBracketBox
            size={8}
            color={isPrimary ? colors.accent : colors.border}
            style={StyleSheet.flatten([glow && styles.glow, style])}
        >
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled || loading}
                activeOpacity={0.7}
                style={[
                    styles.button,
                    isPrimary ? styles.primary : styles.outline,
                    (disabled || loading) && styles.disabled,
                ]}
            >
                {loading ? (
                    <ActivityIndicator color={colors.text} size="small" />
                ) : (
                    <Text
                        style={[styles.text, !isPrimary && styles.outlineText]}
                    >
                        {title}
                    </Text>
                )}
            </TouchableOpacity>
        </CornerBracketBox>
    );
}

const styles = StyleSheet.create({
    button: {
        paddingVertical: 14,
        paddingHorizontal: 48,
        alignItems: "center",
        justifyContent: "center",
    },
    primary: {
        backgroundColor: colors.accent,
    },
    outline: {
        backgroundColor: colors.transparent,
        borderWidth: 1,
        borderColor: colors.border,
    },
    disabled: {
        opacity: 0.4,
    },
    text: {
        ...typography.button,
        color: colors.text,
    },
    outlineText: {
        color: colors.text,
    },
    glow: {
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.8,
        shadowRadius: 20,
        elevation: 12,
    },
});
