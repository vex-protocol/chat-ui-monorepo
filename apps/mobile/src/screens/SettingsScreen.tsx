import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { useStore } from "@nanostores/react";
import notifee, { AndroidImportance } from "@notifee/react-native";

import { clearCredentials } from "../lib/keychain";
import { clearMessages } from "../lib/messages";
import type { AppScreenProps } from "../navigation/types";
import { vexService, $user } from "../store";

export function SettingsScreen({ navigation: _navigation }: AppScreenProps<"Settings">) {
    const user = useStore($user);
    const [loggingOut, setLoggingOut] = useState(false);

    async function handleLogout() {
        setLoggingOut(true);
        // Close connection + reset atoms so navigation redirects to auth.
        // This does NOT invalidate the server session — autoLogin can reuse saved credentials.
        try {
            await vexService.logout();
        } catch {
            /* ignore */
        }
        await clearMessages();
    }

    function handleClearKeys() {
        Alert.alert(
            "Clear device keys",
            "This will permanently delete your device key from this device. You will need to re-register.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: async () => {
                        try {
                            await vexService.logout();
                        } catch {
                            /* ignore */
                        }
                        await clearCredentials();
                        await clearMessages();
                    },
                    style: "destructive",
                    text: "Clear keys",
                },
            ],
        );
    }

    return (
        <ScrollView
            contentContainerStyle={styles.content}
            style={styles.container}
        >
            {/* Account section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Account</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Username</Text>
                    <Text style={styles.value}>{user?.username ?? "—"}</Text>
                </View>

                <View style={styles.row}>
                    <Text style={styles.label}>User ID</Text>
                    <Text style={[styles.value, styles.mono]}>
                        {user?.userID?.slice(0, 16) ?? "—"}…
                    </Text>
                </View>
            </View>

            {/* App info section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>App</Text>

                <View style={styles.row}>
                    <Text style={styles.label}>Version</Text>
                    <Text style={styles.value}>0.1.0</Text>
                </View>

                <View style={[styles.row, styles.rowLast]}>
                    <View style={styles.rowInfo}>
                        <Text style={styles.label}>Notifications</Text>
                        <Text style={styles.desc}>
                            Send a test notification
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={async () => {
                            await notifee.createChannel({
                                id: "vex-messages",
                                importance: AndroidImportance.HIGH,
                                name: "Messages",
                                sound: "default",
                            });
                            await notifee.displayNotification({
                                android: {
                                    channelId: "vex-messages",
                                    pressAction: { id: "default" },
                                    sound: "default",
                                },
                                body: "This is a test notification from Vex.",
                                data: {
                                    authorID: "test",
                                    username: "Test User",
                                },
                                ios: { sound: "default" },
                                title: "Test User",
                            });
                        }}
                        style={styles.testBtn}
                    >
                        <Text style={styles.testBtnText}>Test</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Danger zone */}
            <View style={[styles.section, styles.dangerSection]}>
                <Text style={styles.sectionTitle}>Danger Zone</Text>

                <View style={styles.row}>
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

                <View style={[styles.row, styles.rowLast]}>
                    <View style={styles.rowInfo}>
                        <Text style={styles.label}>Clear device keys</Text>
                        <Text style={styles.desc}>
                            Delete keys and re-register
                        </Text>
                    </View>
                    <TouchableOpacity
                        onPress={handleClearKeys}
                        style={styles.dangerBtn}
                    >
                        <Text style={styles.dangerBtnText}>Clear keys</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: "#1a1a1a", flex: 1 },
    content: { gap: 16, padding: 16 },
    dangerBtn: {
        borderColor: "rgba(229, 57, 53, 0.5)",
        borderRadius: 4,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    dangerBtnText: {
        color: "#e53935",
        fontSize: 13,
        fontWeight: "600",
    },
    dangerSection: {
        borderColor: "rgba(229, 57, 53, 0.4)",
    },
    desc: {
        color: "#666666",
        fontSize: 12,
    },
    label: {
        color: "#e8e8e8",
        fontSize: 14,
        fontWeight: "600",
    },
    mono: {
        fontFamily: "Courier",
        fontSize: 12,
    },
    row: {
        alignItems: "center",
        borderBottomColor: "#2a2a2a",
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    rowInfo: {
        flex: 1,
        gap: 2,
    },
    rowLast: {
        borderBottomWidth: 0,
    },
    section: {
        backgroundColor: "#141414",
        borderColor: "#2a2a2a",
        borderRadius: 8,
        borderWidth: 1,
        overflow: "hidden",
    },
    sectionTitle: {
        borderBottomColor: "#2a2a2a",
        borderBottomWidth: 1,
        color: "#666666",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.5,
        paddingBottom: 6,
        paddingHorizontal: 16,
        paddingTop: 10,
        textTransform: "uppercase",
    },
    testBtn: {
        borderColor: "#3a3a3a",
        borderRadius: 4,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 6,
    },
    testBtnText: {
        color: "#a0a0a0",
        fontSize: 13,
        fontWeight: "600",
    },
    value: {
        color: "#a0a0a0",
        fontSize: 13,
    },
});
