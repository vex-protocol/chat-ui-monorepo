import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, typography } from "../theme";

interface ChatHeaderProps {
    onBack?: () => void;
    onOverflow?: () => void;
    subtitle?: string;
    title: string;
}

export function ChatHeader({
    onBack,
    onOverflow,
    subtitle,
    title,
}: ChatHeaderProps) {
    return (
        <View style={styles.container}>
            <View style={styles.breadcrumb}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backBtn}>
                        <Text style={styles.backArrow}>←</Text>
                    </TouchableOpacity>
                )}
                <Text numberOfLines={1} style={styles.title}>
                    {title}
                </Text>
                {subtitle && (
                    <>
                        <Text style={styles.separator}>|</Text>
                        <Text numberOfLines={1} style={styles.subtitle}>
                            {subtitle}
                        </Text>
                    </>
                )}
            </View>
            <View style={styles.actions}>
                {onOverflow && (
                    <TouchableOpacity
                        accessibilityLabel="Channel menu"
                        hitSlop={8}
                        onPress={onOverflow}
                        style={styles.actionBtn}
                    >
                        <Text style={styles.actionIcon}>⋮</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    actionBtn: {
        alignItems: "center",
        height: 36,
        justifyContent: "center",
        width: 36,
    },
    actionIcon: {
        fontSize: 18,
    },
    actions: {
        flexDirection: "row",
        flexShrink: 0,
        gap: 4,
    },
    backArrow: {
        color: colors.text,
        fontSize: 18,
    },
    backBtn: {
        marginRight: 4,
    },
    breadcrumb: {
        alignItems: "center",
        flex: 1,
        flexDirection: "row",
        gap: 8,
        minWidth: 0,
    },
    container: {
        alignItems: "center",
        backgroundColor: colors.bg,
        borderBottomColor: colors.borderSubtle,
        borderBottomWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    separator: {
        color: colors.muted,
        fontSize: 14,
    },
    subtitle: {
        ...typography.body,
        color: colors.muted,
        flex: 1,
    },
    title: {
        ...typography.button,
        color: colors.text,
        flexShrink: 1,
        fontSize: 16,
    },
});
