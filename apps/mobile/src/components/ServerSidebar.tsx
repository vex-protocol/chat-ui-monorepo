import type { Channel, User } from "@vex-chat/libvex";

import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import {
    $dmUnreadCounts,
    $familiars,
    $messages,
    $totalDmUnread,
    avatarHue,
} from "@vex-chat/store";
import { $servers } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { colors } from "../theme";

import { VexLogo } from "./VexLogo";

interface ServerSidebarProps {
    activeChannelId: null | string;
    activeDmUserId: null | string;
    activeServerId: null | string;
    authStatus:
        | "authenticated"
        | "checking"
        | "offline"
        | "signed_out"
        | "unauthorized";
    channels: Channel[];
    currentServerName: string;
    onAddServer: () => void;
    onSelectChannel: (channel: Channel) => void;
    onSelectDM: (user: User) => void;
    onSelectHome: () => void;
    onSelectServer: (serverId: string) => void;
    onSettings: () => void;
    safeAreaBottom?: number;
    safeAreaTop?: number;
}

export function ServerSidebar({
    activeChannelId,
    activeDmUserId,
    activeServerId,
    authStatus,
    channels,
    currentServerName,
    onAddServer,
    onSelectChannel,
    onSelectDM,
    onSelectHome,
    onSelectServer,
    onSettings,
    safeAreaBottom = 0,
    safeAreaTop = 0,
}: ServerSidebarProps) {
    const servers = useStore($servers);
    const familiars = useStore($familiars);
    const messages = useStore($messages);
    const dmUnreadCounts = useStore($dmUnreadCounts);
    const serverList = Object.values(servers);
    const dmList = Object.values(familiars).filter((user) => {
        const thread = messages[user.userID];
        return Boolean(thread && thread.length > 0);
    });
    const totalUnread = useStore($totalDmUnread);
    const homeActive = activeServerId === null;

    return (
        <View style={styles.drawerContainer}>
            <View
                style={[
                    styles.railContainer,
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
                    <TouchableOpacity
                        onPress={onSelectHome}
                        style={styles.homeBtn}
                    >
                        <VexLogo showWordmark={false} size={22} />
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
                            <View
                                key={server.serverID}
                                style={styles.serverRow}
                            >
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
                                authStatus === "checking" &&
                                    styles.authDotChecking,
                                authStatus === "offline" &&
                                    styles.authDotOffline,
                                authStatus === "signed_out" &&
                                    styles.authDotSignedOut,
                                authStatus === "unauthorized" &&
                                    styles.authDotUnauthorized,
                            ]}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <View
                style={[
                    styles.channelPane,
                    {
                        paddingBottom: safeAreaBottom + 10,
                        paddingTop: safeAreaTop + 10,
                    },
                ]}
            >
                <Text numberOfLines={1} style={styles.channelPaneTitle}>
                    {activeServerId ? currentServerName : "Direct Messages"}
                </Text>
                {!activeServerId ? (
                    dmList.length === 0 ? (
                        <Text style={styles.channelPaneEmpty}>
                            No DM conversations yet
                        </Text>
                    ) : (
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            style={styles.channelList}
                        >
                            {dmList.map((user) => {
                                const unread = dmUnreadCounts[user.userID] ?? 0;
                                const active = user.userID === activeDmUserId;
                                return (
                                    <TouchableOpacity
                                        key={user.userID}
                                        onPress={() => {
                                            onSelectDM(user);
                                        }}
                                        style={[
                                            styles.channelItem,
                                            active && styles.channelItemActive,
                                        ]}
                                    >
                                        <View style={styles.dmRow}>
                                            <View
                                                style={[
                                                    styles.dmAvatar,
                                                    {
                                                        backgroundColor: `hsl(${avatarHue(user.userID)}, 45%, 40%)`,
                                                    },
                                                ]}
                                            >
                                                <Text
                                                    style={styles.dmAvatarText}
                                                >
                                                    {user.username
                                                        .slice(0, 1)
                                                        .toUpperCase()}
                                                </Text>
                                            </View>
                                            <View style={styles.dmMeta}>
                                                <View style={styles.dmNameRow}>
                                                    <Text
                                                        numberOfLines={1}
                                                        style={[
                                                            styles.channelItemText,
                                                            active &&
                                                                styles.channelItemTextActive,
                                                        ]}
                                                    >
                                                        {user.username}
                                                    </Text>
                                                    {unread > 0 ? (
                                                        <View
                                                            style={
                                                                styles.dmNewDot
                                                            }
                                                        />
                                                    ) : null}
                                                </View>
                                            </View>
                                            {unread > 0 ? (
                                                <View style={styles.dmBadge}>
                                                    <Text
                                                        style={
                                                            styles.dmBadgeText
                                                        }
                                                    >
                                                        {unread > 99
                                                            ? "99+"
                                                            : unread}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )
                ) : channels.length === 0 ? (
                    <Text style={styles.channelPaneEmpty}>No channels yet</Text>
                ) : (
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={styles.channelList}
                    >
                        {channels.map((channel) => {
                            const active =
                                channel.channelID === activeChannelId;
                            return (
                                <TouchableOpacity
                                    key={channel.channelID}
                                    onPress={() => {
                                        onSelectChannel(channel);
                                    }}
                                    style={[
                                        styles.channelItem,
                                        active && styles.channelItemActive,
                                    ]}
                                >
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.channelItemText,
                                            active &&
                                                styles.channelItemTextActive,
                                        ]}
                                    >
                                        # {channel.name}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                )}
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
    channelItem: {
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
    },
    channelItemActive: {
        backgroundColor: "rgba(255,255,255,0.09)",
        borderColor: "rgba(255,255,255,0.16)",
        borderWidth: 1,
    },
    channelItemText: {
        color: colors.textSecondary,
        fontSize: 13,
    },
    channelItemTextActive: {
        color: colors.text,
        fontWeight: "600",
    },
    channelList: {
        marginTop: 8,
    },
    channelPane: {
        backgroundColor: "#12151d",
        borderLeftColor: "rgba(255,255,255,0.08)",
        borderLeftWidth: 1,
        flex: 1,
        paddingHorizontal: 10,
    },
    channelPaneEmpty: {
        color: "rgba(255,255,255,0.5)",
        fontSize: 12,
        marginTop: 8,
    },
    channelPaneTitle: {
        color: colors.text,
        fontSize: 13,
        fontWeight: "600",
    },
    divider: {
        backgroundColor: "rgba(255,255,255,0.12)",
        height: 1,
        marginVertical: 8,
        width: 40,
    },
    dmAvatar: {
        alignItems: "center",
        borderRadius: 12,
        height: 24,
        justifyContent: "center",
        width: 24,
    },
    dmAvatarText: {
        color: "#fff",
        fontSize: 11,
        fontWeight: "700",
    },
    dmBadge: {
        alignItems: "center",
        backgroundColor: colors.error,
        borderRadius: 10,
        justifyContent: "center",
        minWidth: 20,
        paddingHorizontal: 5,
        paddingVertical: 2,
    },
    dmBadgeText: {
        color: "#fff",
        fontSize: 10,
        fontWeight: "700",
    },
    dmMeta: {
        flex: 1,
        minWidth: 0,
    },
    dmNameRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 6,
    },
    dmNewDot: {
        backgroundColor: colors.accent,
        borderRadius: 999,
        height: 6,
        marginTop: 1,
        width: 6,
    },
    dmRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
        justifyContent: "space-between",
    },
    drawerContainer: {
        backgroundColor: "#0b0d12",
        borderRightColor: "rgba(255,255,255,0.08)",
        borderRightWidth: 1,
        flex: 1,
        flexDirection: "row",
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
    railContainer: {
        alignItems: "center",
        width: 72,
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
