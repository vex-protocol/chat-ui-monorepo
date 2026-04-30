import type { AppScreenProps } from "../navigation/types";

import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";

import { ChatHeader } from "../components/ChatHeader";
import { getServerUrl } from "../lib/config";
import { clearCredentials, loadCredentials } from "../lib/keychain";
import { colors, typography } from "../theme";

export function SettingsScreen({ navigation }: AppScreenProps<"Settings">) {
    const user = useStore($user);
    const [exportingIdentity, setExportingIdentity] = useState(false);
    const [erasingData, setErasingData] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [wsDebugEnabled, setWsDebugEnabled] = useState(() =>
        vexService.getWebsocketDebugEnabled(),
    );

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

    function handleLogout() {
        Alert.alert(
            "Sign out?",
            "Your messages stay encrypted on this device. You can sign back in anytime.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        setLoggingOut(true);
                        // Close connection + reset atoms so navigation redirects to auth.
                        // Credentials remain in the keychain so autoLogin can reuse them.
                        void vexService.logout().catch(() => {
                            /* ignore */
                        });
                    },
                    style: "destructive",
                    text: "Sign out",
                },
            ],
        );
    }

    function handleResetUnreadCounts(): void {
        Alert.alert(
            "Reset unread counters?",
            "This only resets local unread badges on this device.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        vexService.resetAllUnread();
                        Alert.alert("Done", "Unread counters have been reset.");
                    },
                    text: "Reset",
                },
            ],
        );
    }

    function handleDeleteAllLocalData(): void {
        Alert.alert(
            "Delete all local data?",
            "This removes all local messages and session data from this device. This cannot be undone.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void deleteAllLocalData();
                    },
                    style: "destructive",
                    text: erasingData ? "Deleting..." : "Delete data",
                },
            ],
        );
    }

    async function deleteAllLocalData(): Promise<void> {
        if (erasingData) return;
        setErasingData(true);
        try {
            await clearCredentials();
            await vexService.deleteAllData();
            Alert.alert(
                "Local data deleted",
                "You have been signed out on this device.",
            );
        } catch (err: unknown) {
            Alert.alert(
                "Delete failed",
                err instanceof Error
                    ? err.message
                    : "Failed to delete local data.",
            );
        } finally {
            setErasingData(false);
        }
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

    function handleSendTestNotification() {
        void (async () => {
            await Notifications.setNotificationChannelAsync("vex-messages", {
                importance: AndroidImportance.HIGH,
                name: "Messages",
            });
            await Notifications.scheduleNotificationAsync({
                content: {
                    body: "This is a test notification from Vex.",
                    data: {
                        authorID: "test",
                        username: "Test User",
                    },
                    title: "Test User",
                },
                trigger: { channelId: "vex-messages" },
            });
        })();
    }

    return (
        <View style={styles.container}>
            <ChatHeader title="Settings" />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    <View style={styles.rowCard}>
                        <Text style={styles.label}>Username</Text>
                        <Text style={styles.value}>
                            {user?.username ?? "—"}
                        </Text>
                    </View>

                    <View style={styles.rowCard}>
                        <Text style={styles.label}>User ID</Text>
                        <Text style={[styles.value, styles.mono]}>
                            {user?.userID.slice(0, 16) ?? "—"}…
                        </Text>
                    </View>

                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>
                                Identity key backup
                            </Text>
                            <Text style={styles.desc}>
                                Export this account's identity key for recovery
                            </Text>
                        </View>
                        <TouchableOpacity
                            disabled={exportingIdentity}
                            onPress={handleExportIdentityKey}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>
                                {exportingIdentity ? "Exporting…" : "Export"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>Devices</Text>
                            <Text style={styles.desc}>
                                Manage pending approvals and current devices
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate("Devices");
                            }}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>Open</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>

                    <View style={styles.rowCard}>
                        <Text style={styles.label}>Version</Text>
                        <Text style={styles.value}>0.1.0</Text>
                    </View>

                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>Notifications</Text>
                            <Text style={styles.desc}>
                                Send a test notification
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleSendTestNotification}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>Test</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>
                                WebSocket debug logs
                            </Text>
                            <Text style={styles.desc}>
                                Print inbound/outbound frames to terminal
                            </Text>
                        </View>
                        <Switch
                            onValueChange={(value) => {
                                setWsDebugEnabled(value);
                                vexService.setWebsocketDebug(value);
                            }}
                            value={wsDebugEnabled}
                        />
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Danger Zone</Text>

                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>
                                Reset unread counters
                            </Text>
                            <Text style={styles.desc}>
                                Clear all DM and channel unread badges on this
                                device
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleResetUnreadCounts}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>Reset</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.rowCard, styles.rowCardDanger]}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>Delete local data</Text>
                            <Text style={styles.desc}>
                                Wipe messages and session data from this device
                            </Text>
                        </View>
                        <TouchableOpacity
                            disabled={erasingData}
                            onPress={handleDeleteAllLocalData}
                            style={styles.dangerBtn}
                        >
                            <Text style={styles.dangerBtnText}>
                                {erasingData ? "Deleting..." : "Delete"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.rowCard, styles.rowCardDanger]}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>Sign out</Text>
                            <Text style={styles.desc}>
                                Disconnect and return to the login screen
                            </Text>
                        </View>
                        <TouchableOpacity
                            disabled={loggingOut}
                            onPress={handleLogout}
                            style={styles.dangerBtn}
                        >
                            <Text style={styles.dangerBtnText}>
                                {loggingOut ? "Signing out…" : "Sign out"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    dangerBtn: {
        alignItems: "center",
        borderColor: "rgba(229, 57, 53, 0.4)",
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 84,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    dangerBtnText: {
        ...typography.button,
        color: colors.error,
        fontWeight: "600",
    },
    desc: {
        ...typography.body,
        color: "rgba(255,255,255,0.52)",
        fontSize: 12,
    },
    label: {
        ...typography.button,
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    mono: {
        fontFamily: typography.body.fontFamily,
        fontSize: 12,
        letterSpacing: 0.25,
    },
    rowCard: {
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
    rowCardDanger: {
        borderColor: "rgba(229, 57, 53, 0.28)",
    },
    rowInfo: {
        flex: 1,
        gap: 2,
    },
    section: {
        gap: 8,
    },
    sectionTitle: {
        ...typography.label,
        color: "rgba(255,255,255,0.52)",
        paddingHorizontal: 2,
        textTransform: "uppercase",
    },
    testBtn: {
        alignItems: "center",
        borderColor: "rgba(255,255,255,0.2)",
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 68,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    testBtnText: {
        ...typography.button,
        color: colors.textSecondary,
        fontWeight: "600",
    },
    value: {
        ...typography.body,
        color: "rgba(255,255,255,0.66)",
        fontSize: 13,
    },
});
