import type { AppScreenProps } from "../navigation/types";

import React, { useState } from "react";
import { Alert, ScrollView, Share, StyleSheet, View } from "react-native";

import { $user } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";
import { MenuRow, MenuSection } from "../components/MenuRow";
import { getServerUrl } from "../lib/config";
import { loadCredentials } from "../lib/keychain";
import { colors } from "../theme";

export function PendingApprovalsScreen({
    navigation,
}: AppScreenProps<"Devices">) {
    const user = useStore($user);
    const [exportingIdentity, setExportingIdentity] = useState(false);

    function handleExportIdentityKey(): void {
        Alert.alert(
            "Export identity key?",
            "Store this securely. Anyone with this key can access your account on this server.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void exportIdentityKey();
                    },
                    text: "Export",
                },
            ],
        );
    }

    async function exportIdentityKey(): Promise<void> {
        const username = user?.username;
        if (!username) {
            Alert.alert("Export failed", "No active account found.");
            return;
        }
        setExportingIdentity(true);
        try {
            const creds = await loadCredentials(username);
            if (!creds?.deviceKey) {
                Alert.alert(
                    "Export failed",
                    "No identity key is saved for this account on this device.",
                );
                return;
            }
            const exportText = [
                "# Vex identity key backup",
                `server: ${getServerUrl()}`,
                `username: ${creds.username}`,
                `deviceID: ${creds.deviceID}`,
                `identityKey: ${creds.deviceKey}`,
            ].join("\n");

            await Share.share({
                message: exportText,
                title: "Vex identity key backup",
            });
        } catch (err: unknown) {
            Alert.alert(
                "Export failed",
                err instanceof Error ? err.message : "Unexpected export error.",
            );
        } finally {
            setExportingIdentity(false);
        }
    }

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.goBack();
                }}
                title="Devices"
            />
            <ScrollView contentContainerStyle={styles.content}>
                <MenuSection title="Devices">
                    <MenuRow
                        description="Your signed-in devices"
                        icon="phone-portrait-outline"
                        label="Device Manager"
                        onPress={() => {
                            navigation.navigate("DeviceManager");
                        }}
                    />
                    <MenuRow
                        description="Approve new device sign-ins"
                        icon="shield-checkmark-outline"
                        label="Device Requests"
                        onPress={() => {
                            navigation.navigate("DeviceRequests");
                        }}
                    />
                </MenuSection>

                <MenuSection title="Security">
                    <MenuRow
                        description="Export identity key for recovery"
                        disabled={exportingIdentity}
                        icon="key-outline"
                        label={
                            exportingIdentity
                                ? "Exporting..."
                                : "Identity key backup"
                        }
                        onPress={handleExportIdentityKey}
                    />
                    <MenuRow
                        description="Current auth and token details"
                        icon="ribbon-outline"
                        label="Session"
                        onPress={() => {
                            navigation.navigate("SessionDetails");
                        }}
                    />
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
