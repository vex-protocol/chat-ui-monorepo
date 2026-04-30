import type { AppScreenProps } from "../navigation/types";

import React, { useMemo, useState } from "react";
import {
    Alert,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { $channels, $servers, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";
import { colors, typography } from "../theme";

export function ServerSettingsScreen({
    navigation,
    route,
}: AppScreenProps<"ServerSettings">) {
    const { serverID } = route.params;
    const channelsByServer = useStore($channels, { keys: [serverID] });
    const servers = useStore($servers, { keys: [serverID] });
    const [channelName, setChannelName] = useState("");
    const [creatingChannel, setCreatingChannel] = useState(false);
    const [createChannelError, setCreateChannelError] = useState("");
    const [deletingServer, setDeletingServer] = useState(false);
    const serverName =
        servers[serverID]?.name ?? route.params.serverName ?? "Server";
    const channels = channelsByServer[serverID] ?? [];

    const canCreateChannel = useMemo(
        () => channelName.trim().length > 0 && !creatingChannel,
        [channelName, creatingChannel],
    );

    async function handleCreateChannel(): Promise<void> {
        const nextName = channelName.trim();
        if (!nextName || creatingChannel) {
            return;
        }
        setCreatingChannel(true);
        setCreateChannelError("");
        try {
            const result = await vexService.createChannel(nextName, serverID);
            if (!result.ok) {
                setCreateChannelError(
                    result.error ?? "Failed to create channel.",
                );
                return;
            }
            setChannelName("");
            const updatedChannels = $channels.get()[serverID] ?? [];
            const created = updatedChannels[updatedChannels.length - 1];
            if (created) {
                navigation.replace("Channel", {
                    channelID: created.channelID,
                    channelName: created.name,
                    serverID,
                });
            }
        } finally {
            setCreatingChannel(false);
        }
    }

    function confirmDeleteServer(): void {
        Alert.alert(
            "Delete server?",
            `Delete ${serverName}? This cannot be undone.`,
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void handleDeleteServer();
                    },
                    style: "destructive",
                    text: deletingServer ? "Deleting..." : "Delete server",
                },
            ],
        );
    }

    async function handleDeleteServer(): Promise<void> {
        if (deletingServer) return;
        setDeletingServer(true);
        try {
            const result = await vexService.deleteServer(serverID);
            if (!result.ok) {
                Alert.alert(
                    "Delete failed",
                    result.error ?? "Failed to delete server.",
                );
                return;
            }
            navigation.reset({
                index: 0,
                routes: [{ name: "DMList" }],
            });
        } finally {
            setDeletingServer(false);
        }
    }

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.goBack();
                }}
                title={`${serverName} settings`}
            />
            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Channels</Text>
                    <Text style={styles.sectionHint}>
                        {channels.length} existing channel
                        {channels.length === 1 ? "" : "s"}
                    </Text>
                    <View style={styles.inputRow}>
                        <TextInput
                            autoCapitalize="none"
                            editable={!creatingChannel}
                            onChangeText={setChannelName}
                            placeholder="new-channel-name"
                            placeholderTextColor={colors.mutedDark}
                            style={styles.input}
                            value={channelName}
                        />
                        <TouchableOpacity
                            disabled={!canCreateChannel}
                            onPress={() => {
                                void handleCreateChannel();
                            }}
                            style={[
                                styles.button,
                                styles.buttonPrimary,
                                !canCreateChannel && styles.buttonDisabled,
                            ]}
                        >
                            <Text style={styles.buttonPrimaryText}>
                                {creatingChannel ? "Creating..." : "Create"}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    {createChannelError !== "" ? (
                        <Text style={styles.errorText}>
                            {createChannelError}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Invites</Text>
                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate("Invite", {
                                serverID,
                                serverName,
                            });
                        }}
                        style={[styles.button, styles.buttonSecondary]}
                    >
                        <Text style={styles.buttonSecondaryText}>
                            Manage invite links
                        </Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Danger zone</Text>
                    <TouchableOpacity
                        disabled={deletingServer}
                        onPress={confirmDeleteServer}
                        style={[styles.button, styles.buttonDanger]}
                    >
                        <Text style={styles.buttonDangerText}>
                            {deletingServer ? "Deleting..." : "Delete server"}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        borderRadius: 10,
        borderWidth: 1,
        minHeight: 40,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    buttonDanger: {
        borderColor: "rgba(229,57,53,0.48)",
    },
    buttonDangerText: {
        ...typography.button,
        color: colors.error,
    },
    buttonDisabled: {
        opacity: 0.4,
    },
    buttonPrimary: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    buttonPrimaryText: {
        ...typography.button,
        color: "#fff",
    },
    buttonSecondary: {
        borderColor: "rgba(255,255,255,0.2)",
    },
    buttonSecondaryText: {
        ...typography.button,
        color: colors.textSecondary,
    },
    container: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    content: {
        gap: 16,
        padding: 14,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
        fontSize: 12,
        marginTop: 8,
    },
    input: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 10,
        borderWidth: 1,
        color: colors.textSecondary,
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    inputRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
        marginTop: 8,
    },
    section: {
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.1)",
        borderRadius: 12,
        borderWidth: 1,
        gap: 6,
        padding: 12,
    },
    sectionHint: {
        ...typography.body,
        color: "rgba(255,255,255,0.56)",
        fontSize: 12,
    },
    sectionTitle: {
        ...typography.label,
        color: "rgba(255,255,255,0.72)",
    },
});
