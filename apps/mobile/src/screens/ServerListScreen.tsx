import React from "react";
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
} from "react-native";
import { useStore } from "@nanostores/react";
import type { IServer } from "@vex-chat/libvex";
import { $servers } from "../store";
import { avatarHue } from "@vex-chat/store";

export function ServerListScreen({ navigation }: { navigation: any }) {
    const servers = useStore($servers);
    const serverList = Object.values(servers);

    function renderServer({ item }: { item: IServer }) {
        return (
            <TouchableOpacity
                style={styles.row}
                onPress={() =>
                    navigation.navigate("ChannelList", {
                        serverID: item.serverID,
                        serverName: item.name,
                    })
                }
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
    container: { flex: 1, backgroundColor: "#1a1a1a" },
    row: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#2a2a2a",
    },
    icon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
    },
    iconText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    name: { color: "#e8e8e8", fontSize: 16 },
    empty: { flex: 1, alignItems: "center", justifyContent: "center" },
    emptyText: { color: "#666666", fontSize: 14, fontStyle: "italic" },
});
