import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $totalDmUnread } from "@vex-chat/store";
import { $servers } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { colors } from "../theme";

interface ServerSidebarProps {
    activeServerId: null | string;
    authStatus:
        | "authenticated"
        | "checking"
        | "offline"
        | "signed_out"
        | "unauthorized";
    onAddServer: () => void;
    onSelectHome: () => void;
    onSelectServer: (serverId: string) => void;
    onSettings: () => void;
    safeAreaBottom?: number;
    safeAreaTop?: number;
}

export function ServerSidebar({
    activeServerId,
    authStatus,
    onAddServer,
    onSelectHome,
    onSelectServer,
    onSettings,
    safeAreaBottom = 0,
    safeAreaTop = 0,
}: ServerSidebarProps) {
    const servers = useStore($servers);
    const serverList = Object.values(servers);
    const totalUnread = useStore($totalDmUnread);
    const homeActive = activeServerId === null;

    return (
        <View
            style={[
                styles.container,
                {
                    paddingBottom: safeAreaBottom + 10,
                    paddingTop: safeAreaTop + 10,
                },
            ]}
        >
            <View style={styles.topSection}>
                <View
                    style={[
                        styles.activePill,
                        homeActive && styles.activePillVisible,
                    ]}
                />
                <TouchableOpacity onPress={onSelectHome} style={styles.homeBtn}>
                    <View style={styles.envelopeIcon}>
                        <View style={styles.envelopeFlapLeft} />
                        <View style={styles.envelopeFlapRight} />
                    </View>
                    {totalUnread > 0 && (
                        <View style={styles.homeBadge}>
                            <Text style={styles.homeBadgeText}>
                                {totalUnread > 99 ? "99+" : totalUnread}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.serverList}
            >
                {serverList.map((server) => {
                    const active = server.serverID === activeServerId;
                    return (
                        <View key={server.serverID} style={styles.serverRow}>
                            <View
                                style={[
                                    styles.activePill,
                                    active && styles.activePillVisible,
                                ]}
                            />
                            <TouchableOpacity
                                onPress={() => {
                                    onSelectServer(server.serverID);
                                }}
                                style={[
                                    styles.serverBtn,
                                    active && styles.serverBtnActive,
                                ]}
                            >
                                <Text style={styles.serverInitial}>
                                    {server.name.slice(0, 2).toUpperCase()}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    );
                })}

                <View style={styles.serverRow}>
                    <View style={styles.activePill} />
                    <TouchableOpacity
                        onPress={onAddServer}
                        style={styles.addBtn}
                    >
                        <Text style={styles.addText}>+</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            <View style={styles.settingsRow}>
                <View style={styles.activePill} />
                <TouchableOpacity
                    onPress={onSettings}
                    style={styles.settingsBtn}
                >
                    <View style={styles.userIconHead} />
                    <View style={styles.userIconBody} />
                    <View
                        style={[
                            styles.authDot,
                            authStatus === "authenticated" &&
                                styles.authDotAuthenticated,
                            authStatus === "checking" && styles.authDotChecking,
                            authStatus === "offline" && styles.authDotOffline,
                            authStatus === "signed_out" &&
                                styles.authDotSignedOut,
                            authStatus === "unauthorized" &&
                                styles.authDotUnauthorized,
                        ]}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    activePill: {
        backgroundColor: colors.text,
        borderRadius: 2,
        height: 20,
        opacity: 0,
        width: 3,
    },
    activePillVisible: {
        opacity: 1,
    },
    addBtn: {
        alignItems: "center",
        backgroundColor: "#171a22",
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 16,
        borderWidth: 1,
        height: 48,
        justifyContent: "center",
        marginVertical: 4,
        width: 48,
    },
    addText: {
        color: colors.textSecondary,
        fontSize: 24,
        marginTop: -2,
    },
    authDot: {
        borderColor: "#171a22",
        borderRadius: 999,
        borderWidth: 2,
        bottom: 5,
        height: 12,
        position: "absolute",
        right: 5,
        width: 12,
    },
    authDotAuthenticated: {
        backgroundColor: "#30D158",
    },
    authDotChecking: {
        backgroundColor: "#FFD60A",
    },
    authDotOffline: {
        backgroundColor: "#8E8E93",
    },
    authDotSignedOut: {
        backgroundColor: "#6B7280",
    },
    authDotUnauthorized: {
        backgroundColor: "#FF453A",
    },
    container: {
        alignItems: "center",
        backgroundColor: "#0b0d12",
        borderRightColor: "rgba(255,255,255,0.08)",
        borderRightWidth: 1,
        flex: 1,
        width: 72,
    },
    divider: {
        backgroundColor: "rgba(255,255,255,0.12)",
        height: 1,
        marginVertical: 8,
        width: 40,
    },
    envelopeFlapLeft: {
        backgroundColor: "rgba(255,255,255,0.9)",
        borderRadius: 999,
        height: 2,
        left: 4,
        position: "absolute",
        top: 7,
        transform: [{ rotate: "34deg" }],
        width: 12,
    },
    envelopeFlapRight: {
        backgroundColor: "rgba(255,255,255,0.9)",
        borderRadius: 999,
        height: 2,
        position: "absolute",
        right: 4,
        top: 7,
        transform: [{ rotate: "-34deg" }],
        width: 12,
    },
    envelopeIcon: {
        borderColor: "rgba(255,255,255,0.88)",
        borderRadius: 6,
        borderWidth: 1.6,
        height: 18,
        position: "relative",
        width: 24,
    },
    homeBadge: {
        alignItems: "center",
        backgroundColor: colors.error,
        borderColor: colors.surface,
        borderRadius: 9,
        borderWidth: 2,
        bottom: -2,
        height: 18,
        justifyContent: "center",
        minWidth: 18,
        paddingHorizontal: 4,
        position: "absolute",
        right: -2,
    },
    homeBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "700",
    },
    homeBtn: {
        alignItems: "center",
        backgroundColor: "#171a22",
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 16,
        borderWidth: 1,
        height: 48,
        justifyContent: "center",
        width: 48,
    },
    serverBtn: {
        alignItems: "center",
        backgroundColor: "#171a22",
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 16,
        borderWidth: 1,
        height: 48,
        justifyContent: "center",
        marginVertical: 4,
        width: 48,
    },
    serverBtnActive: {
        backgroundColor: "#1f2430",
        borderColor: colors.accent,
    },
    serverInitial: {
        color: colors.text,
        fontSize: 14,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    serverList: {
        flex: 1,
    },
    serverRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
    },
    settingsBtn: {
        alignItems: "center",
        backgroundColor: "#171a22",
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 16,
        borderWidth: 1,
        height: 48,
        justifyContent: "center",
        marginTop: 6,
        position: "relative",
        width: 48,
    },
    settingsRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
    },
    topSection: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
    },
    userIconBody: {
        backgroundColor: colors.textSecondary,
        borderRadius: 4,
        height: 6,
        marginTop: 2,
        width: 14,
    },
    userIconHead: {
        backgroundColor: colors.textSecondary,
        borderRadius: 5,
        height: 10,
        width: 10,
    },
});
