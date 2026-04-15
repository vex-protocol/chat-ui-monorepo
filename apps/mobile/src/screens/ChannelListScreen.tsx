import type { AppScreenProps } from "../navigation/types";
import type { Channel } from "@vex-chat/libvex";

import React from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $channels, $servers } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";

export function ChannelListScreen({
    navigation,
    route,
}: AppScreenProps<"ChannelList">) {
    const { serverID } = route.params;
    const allChannels = useStore($channels, { keys: [serverID] });
    const servers = useStore($servers, { keys: [serverID] });
    const channels: Channel[] = allChannels[serverID] ?? [];
    const serverName =
        servers[serverID]?.name ?? route.params.serverName ?? "Server";

    function renderChannel({ item }: { item: Channel }) {
        return (
            <TouchableOpacity
                onPress={() => {
                    navigation.navigate("Channel", {
                        channelID: item.channelID,
                        channelName: item.name,
                        serverID,
                    });
                }}
                style={styles.row}
            >
                <Text style={styles.hash}>#</Text>
                <Text style={styles.name}>{item.name}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            <ChatHeader
                onOverflow={() => {
                    navigation.navigate("Invite", { serverID, serverName });
                }}
                title={serverName}
            />

            {channels.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No channels</Text>
                </View>
            ) : (
                <FlatList
                    data={channels}
                    keyExtractor={(c) => c.channelID}
                    renderItem={renderChannel}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: "#1a1a1a", flex: 1 },
    empty: { alignItems: "center", flex: 1, justifyContent: "center" },
    emptyText: { color: "#666666", fontSize: 14, fontStyle: "italic" },
    hash: { color: "#666666", fontSize: 18, fontWeight: "700", width: 20 },
    name: { color: "#e8e8e8", fontSize: 15 },
    row: {
        alignItems: "center",
        borderBottomColor: "#2a2a2a",
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: 8,
        padding: 14,
    },
});
