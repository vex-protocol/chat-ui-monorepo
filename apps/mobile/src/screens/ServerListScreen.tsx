import type { IServer as Server } from "@vex-chat/libvex";

import React from "react";
import {
    FlatList,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { avatarHue } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { ServersStackParamList } from "../navigation/types";
import { $servers } from "../store";

export function ServerListScreen({ navigation }: NativeStackScreenProps<ServersStackParamList, "ServerList">) {
    const servers = useStore($servers);
    const serverList = Object.values(servers);

    function renderServer({ item }: { item: Server }) {
        return (
            <TouchableOpacity
                onPress={() =>
                    navigation.navigate("ChannelList", {
                        serverID: item.serverID,
                        serverName: item.name,
                    })
                }
                style={styles.row}
            >
                <View
                    style={[
                        styles.icon,
                        {
                            backgroundColor: `hsl(${avatarHue(item.serverID)}, 45%, 40%)`,
                        },
                    ]}
                >
                    <Text style={styles.iconText}>
                        {item.icon || item.name.slice(0, 1).toUpperCase()}
                    </Text>
                </View>
                <Text style={styles.name}>{item.name}</Text>
            </TouchableOpacity>
        );
    }

    return (
        <View style={styles.container}>
            {serverList.length === 0 ? (
                <View style={styles.empty}>
                    <Text style={styles.emptyText}>No servers yet</Text>
                </View>
            ) : (
                <FlatList
                    data={serverList}
                    keyExtractor={(s) => s.serverID}
                    renderItem={renderServer}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { backgroundColor: "#1a1a1a", flex: 1 },
    empty: { alignItems: "center", flex: 1, justifyContent: "center" },
    emptyText: { color: "#666666", fontSize: 14, fontStyle: "italic" },
    icon: {
        alignItems: "center",
        borderRadius: 20,
        height: 40,
        justifyContent: "center",
        width: 40,
    },
    iconText: { color: "#fff", fontSize: 16, fontWeight: "700" },
    name: { color: "#e8e8e8", fontSize: 16 },
    row: {
        alignItems: "center",
        borderBottomColor: "#2a2a2a",
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: 12,
        padding: 12,
    },
});
