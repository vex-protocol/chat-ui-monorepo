import type { AppScreenProps } from "../navigation/types";

import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";

import { $user } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";
import { MenuRow, MenuSection } from "../components/MenuRow";
import { getServerUrl } from "../lib/config";
import { exportIdentityBackupFile } from "../lib/identityBackup";
import { loadCredentials } from "../lib/keychain";
import { colors } from "../theme";

export function PendingApprovalsScreen({
    navigation,
}: AppScreenProps<"Devices">) {
    const user = useStore($user);
    const [exportingIdentity, setExportingIdentity] = useState(false);

    function handleExportIdentityKey(): void {
        Alert.alert(
            "Save identity backup?",
            "A JSON file will be saved to a location you choose. Anyone with this file can sign in as you on this server until you remove the device. Treat it like a password.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void exportIdentityKey();
                    },
                    text: "Continue",
                },
            ],
        );
    }

    async function exportIdentityKey(): Promise<void> {
        const username = user?.username;
        const userID = user?.userID;
        if (!username || !userID) {
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
            const result = await exportIdentityBackupFile({
                deviceID: creds.deviceID,
                deviceKey: creds.deviceKey,
                server: getServerUrl(),
                userID,
                username: creds.username,
            });
            if (!result.ok && result.error) {
                Alert.alert("Export failed", result.error);
            }
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
                        description="Save a backup file for restoring on another device"
                        disabled={exportingIdentity}
                        icon="key-outline"
                        label={
                            exportingIdentity
                                ? "Preparing backup…"
                                : "Save identity backup"
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
