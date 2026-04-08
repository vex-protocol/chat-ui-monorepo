import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";
import { colors, typography } from "../theme";
import { CornerBracketBox } from "./CornerBracketBox";
import { PrivacyMeter } from "./PrivacyMeter";

interface AuthMethodCardProps {
    icon: React.ReactNode;
    title: string;
    privacyLevel: 1 | 2 | 3 | 4;
    privacyLabel: string;
    badge?: string;
    onPress: () => void;
}

export function AuthMethodCard({
    icon,
    title,
    privacyLevel,
    privacyLabel,
    badge,
    onPress,
}: AuthMethodCardProps) {
    return (
        <CornerBracketBox size={8} color={colors.border}>
            <TouchableOpacity
                onPress={onPress}
                activeOpacity={0.7}
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
    card: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: colors.surface,
        gap: 12,
    },
    iconContainer: {
        width: 40,
        height: 40,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 8,
        backgroundColor: colors.card,
    },
    info: {
        flex: 1,
        gap: 4,
    },
    title: {
        ...typography.button,
        color: colors.text,
    },
    privacyRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    privacyLabel: {
        ...typography.label,
        color: colors.muted,
        fontSize: 10,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: colors.border,
    },
    badgeText: {
        ...typography.label,
        color: colors.muted,
        fontSize: 9,
    },
});
