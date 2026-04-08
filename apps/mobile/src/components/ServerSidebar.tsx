import React from "react";
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $totalDmUnread } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

const vexLogo = require("../assets/images/vex-logo.png");
import { $servers } from "../store";
import { colors } from "../theme";

interface ServerSidebarProps {
    activeServerId: null | string;
    onAddServer: () => void;
    onSelectHome: () => void;
    onSelectServer: (serverId: string) => void;
    onSettings: () => void;
}

export function ServerSidebar({
    activeServerId,
    onAddServer,
    onSelectHome,
    onSelectServer,
    onSettings,
}: ServerSidebarProps) {
    const servers = useStore($servers);
    const serverList = Object.values(servers);
    const totalUnread = useStore($totalDmUnread);

    return (
        <View style={styles.container}>
            {/* Home / Vex icon */}
            <TouchableOpacity onPress={onSelectHome} style={styles.homeBtn}>
                <Image
                    resizeMode="contain"
                    source={vexLogo}
                    style={styles.logo}
                />
                {totalUnread > 0 && (
                    <View style={styles.homeBadge}>
                        <Text style={styles.homeBadgeText}>
                            {totalUnread > 99 ? "99+" : totalUnread}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>

            <View style={styles.divider} />

            {/* Server list */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.serverList}
            >
                {serverList.map((server) => {
                    const active = server.serverID === activeServerId;
                    return (
                        <TouchableOpacity
                            key={server.serverID}
                            onPress={() => { onSelectServer(server.serverID); }}
                            style={[
                                styles.serverBtn,
                                active && styles.serverBtnActive,
                            ]}
                        >
                            <Text style={styles.serverInitial}>
                                {(server.name ?? "S").charAt(0).toUpperCase()}
                            </Text>
                        </TouchableOpacity>
                    );
                })}

                {/* Add server */}
                <TouchableOpacity onPress={onAddServer} style={styles.addBtn}>
                    <Text style={styles.addText}>+</Text>
                </TouchableOpacity>
            </ScrollView>

            {/* Settings gear */}
            <TouchableOpacity onPress={onSettings} style={styles.settingsBtn}>
                <Text style={styles.settingsIcon}>⚙</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    addBtn: {
        alignItems: "center",
        borderColor: colors.border,
        borderRadius: 22,
        borderStyle: "dashed",
        borderWidth: 1,
        height: 44,
        justifyContent: "center",
        marginVertical: 4,
        width: 44,
    },
    addText: {
        color: colors.muted,
        fontSize: 20,
    },
    container: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderRightColor: colors.borderSubtle,
        borderRightWidth: 1,
        paddingVertical: 8,
        width: 60,
    },
    divider: {
        backgroundColor: colors.border,
        height: 1,
        marginVertical: 6,
        width: 32,
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
        height: 44,
        justifyContent: "center",
        marginBottom: 4,
        width: 44,
    },
    logo: {
        height: 28,
        width: 28,
    },
    serverBtn: {
        alignItems: "center",
        backgroundColor: colors.card,
        borderRadius: 22,
        height: 44,
        justifyContent: "center",
        marginVertical: 4,
        width: 44,
    },
    serverBtnActive: {
        backgroundColor: colors.accentDark,
        borderRadius: 14,
    },
    serverInitial: {
        color: colors.text,
        fontSize: 16,
        fontWeight: "600",
    },
    serverList: {
        flex: 1,
    },
    settingsBtn: {
        alignItems: "center",
        height: 44,
        justifyContent: "center",
        marginTop: 4,
        width: 44,
    },
    settingsIcon: {
        color: colors.muted,
        fontSize: 22,
    },
});
