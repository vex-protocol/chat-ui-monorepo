import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { colors, typography } from "../theme";

import { CornerBracketBox } from "./CornerBracketBox";
import { PrivacyMeter } from "./PrivacyMeter";

interface AuthMethodCardProps {
    badge?: string;
    icon: React.ReactNode;
    onPress: () => void;
    privacyLabel: string;
    privacyLevel: 1 | 2 | 3 | 4;
    title: string;
}

export function AuthMethodCard({
    badge,
    icon,
    onPress,
    privacyLabel,
    privacyLevel,
    title,
}: AuthMethodCardProps) {
    return (
        <CornerBracketBox color={colors.border} size={8}>
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={onPress}
                style={styles.card}
            >
                <View style={styles.iconContainer}>{icon}</View>
                <View style={styles.info}>
                    <Text style={styles.title}>{title}</Text>
                    <View style={styles.privacyRow}>
                        <PrivacyMeter level={privacyLevel} />
                        <Text style={styles.privacyLabel}>{privacyLabel}</Text>
                    </View>
                </View>
                {badge && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{badge}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </CornerBracketBox>
    );
}

const styles = StyleSheet.create({
    badge: {
        borderColor: colors.border,
        borderWidth: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    badgeText: {
        ...typography.label,
        color: colors.muted,
        fontSize: 9,
    },
    card: {
        alignItems: "center",
        backgroundColor: colors.surface,
        flexDirection: "row",
        gap: 12,
        padding: 16,
    },
    iconContainer: {
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 8,
        height: 40,
        justifyContent: "center",
        width: 40,
    },
    info: {
        flex: 1,
        gap: 4,
    },
    privacyLabel: {
        ...typography.label,
        color: colors.muted,
        fontSize: 10,
    },
    privacyRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
    },
    title: {
        ...typography.button,
        color: colors.text,
    },
});
