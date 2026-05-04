import type { AppScreenProps } from "../navigation/types";

import React, { useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";

import { $user } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";
import { MenuRow, MenuSection } from "../components/MenuRow";
import { getServerUrl } from "../lib/config";
import {
    exportIdentityBackupFile,
    saveIdentityBackupToFolder,
} from "../lib/identityBackup";
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
            "Anyone with this backup can sign in as you on this server until you remove the device. Treat it like a password.",
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
            const backup = {
                deviceID: creds.deviceID,
                deviceKey: creds.deviceKey,
                server: getServerUrl(),
                userID,
                username: creds.username,
            };

            // Android's share sheet (Intent.ACTION_SEND) doesn't include the
            // system Files app, so "Save to Files" is missing. We surface
            // an explicit destination picker — Storage Access Framework —
            // alongside the regular share sheet. iOS's share sheet already
            // handles "Save to Files" natively, so it skips the dialog.
            if (Platform.OS === "android") {
                const choice = await new Promise<"cancel" | "save" | "share">(
                    (resolve) => {
                        Alert.alert(
                            "Where do you want to save it?",
                            "Save to a folder on this device, or share it with another app.",
                            [
                                {
                                    onPress: () => {
                                        resolve("cancel");
                                    },
                                    style: "cancel",
                                    text: "Cancel",
                                },
                                {
                                    onPress: () => {
                                        resolve("share");
                                    },
                                    text: "Share…",
                                },
                                {
                                    onPress: () => {
                                        resolve("save");
                                    },
                                    text: "Save to device",
                                },
                            ],
                        );
                    },
                );
                if (choice === "cancel") return;
                if (choice === "save") {
                    const result = await saveIdentityBackupToFolder(backup);
                    if (!result.ok && "canceled" in result && result.canceled) {
                        return;
                    }
                    if (!result.ok) {
                        Alert.alert(
                            "Save failed",
                            "error" in result
                                ? result.error
                                : "Could not save the backup.",
                        );
                        return;
                    }
                    Alert.alert(
                        "Backup saved",
                        `Saved as ${result.fileName} in the folder you picked.`,
                    );
                    return;
                }
                // Fall through to share sheet.
            }

            const result = await exportIdentityBackupFile(backup);
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
