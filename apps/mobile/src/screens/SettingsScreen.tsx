import type { AppScreenProps } from "../navigation/types";
import type { Ionicons } from "@expo/vector-icons";

import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { ChatHeader } from "../components/ChatHeader";
import { MenuRow, MenuSection } from "../components/MenuRow";
import { colors } from "../theme";

interface SettingsRow {
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
}

export function SettingsScreen({ navigation }: AppScreenProps<"Settings">) {
    const accountRows: ReadonlyArray<SettingsRow> = [
        {
            description: "Profile, identity, sign out",
            icon: "person-circle-outline",
            label: "Account",
            onPress: () => {
                navigation.navigate("SettingsSection", { section: "account" });
            },
        },
        {
            description: "Manage your devices",
            icon: "phone-portrait-outline",
            label: "Devices",
            onPress: () => {
                navigation.navigate("Devices");
            },
        },
    ];

    const systemRows: ReadonlyArray<SettingsRow> = [
        {
            description: "Unread badges and storage",
            icon: "folder-open-outline",
            label: "Data",
            onPress: () => {
                navigation.navigate("SettingsSection", { section: "data" });
            },
        },
        {
            description: "Connection diagnostics",
            icon: "code-slash-outline",
            label: "Developer",
            onPress: () => {
                navigation.navigate("SettingsSection", {
                    section: "developer",
                });
            },
        },
        {
            description: "Version and server",
            icon: "information-circle-outline",
            label: "About",
            onPress: () => {
                navigation.navigate("SettingsSection", { section: "about" });
            },
        },
    ];

    return (
        <View style={styles.container}>
            <ChatHeader title="Settings" />
            <ScrollView contentContainerStyle={styles.content}>
                <MenuSection title="Account">
                    {accountRows.map((row) => (
                        <MenuRow
                            description={row.description}
                            icon={row.icon}
                            key={row.label}
                            label={row.label}
                            onPress={row.onPress}
                        />
                    ))}
                </MenuSection>
                <MenuSection title="System">
                    {systemRows.map((row) => (
                        <MenuRow
                            description={row.description}
                            icon={row.icon}
                            key={row.label}
                            label={row.label}
                            onPress={row.onPress}
                        />
                    ))}
                </MenuSection>
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
        gap: 18,
        paddingBottom: 24,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
});
