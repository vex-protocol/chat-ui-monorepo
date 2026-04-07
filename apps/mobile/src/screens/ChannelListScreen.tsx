import React from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useStore } from "@nanostores/react";
import type { IChannel } from "@vex-chat/libvex";
import { $channels } from "../store";

export function ChannelListScreen({
    route,
    navigation,
}: {
    route: any;
    navigation: any;
}) {
    const { serverID, serverName } = route.params as {
        serverID: string;
        serverName: string;
    };
    const allChannels = useStore($channels);
    const channels: IChannel[] = allChannels[serverID] ?? [];

    function renderChannel({ item }: { item: IChannel }) {
        return (
            <TouchableOpacity
                style={styles.row}
                onPress={() =>
                    navigation.navigate("Channel", {
                        channelID: item.channelID,
                        channelName: item.name,
                        serverID,
                    })
                }
            >
                <Text style={styles.hash}>#</Text>
                <Text style={styles.name}>{item.name}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
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
    container: { flex: 1, backgroundColor: "#1a1a1a" },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: "#2a2a2a",
    },
    hash: { color: "#666666", fontSize: 18, fontWeight: "700", width: 20 },
    name: { color: "#e8e8e8", fontSize: 15 },
    empty: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: { color: "#666666", fontSize: 14, fontStyle: "italic" },
});
