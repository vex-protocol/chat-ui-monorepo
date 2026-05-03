import type { AppScreenProps } from "../navigation/types";

import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { ChatHeader } from "../components/ChatHeader";
import { colors, typography } from "../theme";

export function SettingsScreen({ navigation }: AppScreenProps<"Settings">) {
    const rows: ReadonlyArray<{
        description: string;
        icon: keyof typeof Ionicons.glyphMap;
        label: string;
        onPress: () => void;
    }> = [
        {
            description: "Username, user ID, identity export",
            icon: "person-circle-outline",
            label: "Account",
            onPress: () => {
                navigation.navigate("SettingsSection", { section: "account" });
            },
        },
        {
            description: "Current devices, plus device request tools",
            icon: "phone-portrait-outline",
            label: "Devices",
            onPress: () => {
                navigation.navigate("Devices");
            },
        },
        {
            description: "Version and server details",
            icon: "information-circle-outline",
            label: "About",
            onPress: () => {
                navigation.navigate("SettingsSection", { section: "about" });
            },
        },
        {
            description: "Notification testing and behavior",
            icon: "notifications-outline",
            label: "Notifications",
            onPress: () => {
                navigation.navigate("SettingsSection", {
                    section: "notifications",
                });
            },
        },
        {
            description: "Unread reset tools",
            icon: "folder-open-outline",
            label: "Data",
            onPress: () => {
                navigation.navigate("SettingsSection", { section: "data" });
            },
        },
        {
            description: "WebSocket and connection diagnostics",
            icon: "code-slash-outline",
            label: "Developer",
            onPress: () => {
                navigation.navigate("SettingsSection", {
                    section: "developer",
                });
            },
        },
    ];

    return (
        <View style={styles.container}>
            <ChatHeader title="Settings" />
            <ScrollView contentContainerStyle={styles.content}>
                {rows.map((row) => (
                    <TouchableOpacity
                        key={row.label}
                        onPress={row.onPress}
                        style={styles.menuCard}
                    >
                        <View style={styles.iconBadge}>
                            <Ionicons
                                color={colors.textSecondary}
                                name={row.icon}
                                size={18}
                            />
                        </View>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>{row.label}</Text>
                            <Text style={styles.desc}>{row.description}</Text>
                        </View>
                        <Ionicons
                            color="rgba(255,255,255,0.48)"
                            name="chevron-forward"
                            size={18}
                        />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    content: {
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    desc: {
        ...typography.body,
        color: "rgba(255,255,255,0.52)",
        fontSize: 12,
    },
    iconBadge: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.06)",
        borderColor: "rgba(255,255,255,0.18)",
        borderRadius: 10,
        borderWidth: 1,
        height: 34,
        justifyContent: "center",
        width: 34,
    },
    label: {
        ...typography.button,
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    menuCard: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderBottomWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 11,
    },
    rowInfo: {
        flex: 1,
        gap: 2,
    },
});
