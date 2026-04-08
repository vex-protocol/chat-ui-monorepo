import React, { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { parseInviteID } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { useNavigation } from "@react-navigation/native";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { $channels, $client, $servers } from "../store";
import { colors, typography } from "../theme";

export function AddServerScreen() {
    const navigation = useNavigation<any>();
    const client = useStore($client);
    const [mode, setMode] = useState<"create" | "join" | "pick">("pick");
    const [name, setName] = useState("");
    const [inviteInput, setInviteInput] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleCreate() {
        if (!name.trim() || !client) return;
        setLoading(true);
        setError("");
        try {
            const server = await client.servers.create(name.trim());
            $servers.setKey(server.serverID, server);
            const ch = await client.channels.retrieve(server.serverID);
            $channels.setKey(server.serverID, ch);
            if (navigation.canGoBack()) navigation.goBack();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to create server",
            );
            setLoading(false);
        }
    }

    async function handleJoin() {
        const inviteID = parseInviteID(inviteInput);
        if (!inviteID) {
            setError("Please enter a valid invite link or code");
            return;
        }
        if (!client) {
            setError("Not connected");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const permission = await client.invites.redeem(inviteID);
            const serverID = permission.resourceID;
            const server = await client.servers.retrieveByID(serverID);
            if (server) {
                $servers.setKey(server.serverID, server);
                const ch = await client.channels.retrieve(server.serverID);
                $channels.setKey(server.serverID, ch);
            }
            if (navigation.canGoBack()) navigation.goBack();
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "Failed to join server",
            );
            setLoading(false);
        }
    }

    if (mode === "pick") {
        return (
            <ScreenLayout>
                <BackButton />
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.heading}>Add a server.</Text>
                        <Text style={styles.subtitle}>
                            Create your own or join an existing one
                        </Text>
                    </View>
                    <View style={styles.options}>
                        <VexButton
                            glow
                            onPress={() => { setMode("create"); }}
                            title="Create a server"
                        />
                        <VexButton
                            onPress={() => { setMode("join"); }}
                            title="Join via invite"
                            variant="outline"
                        />
                    </View>
                </View>
            </ScreenLayout>
        );
    }

    if (mode === "create") {
        return (
            <ScreenLayout>
                <BackButton
                    onPress={() => {
                        setMode("pick");
                        setError("");
                    }}
                />
                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.heading}>Create a server.</Text>
                        <Text style={styles.subtitle}>
                            Give your server a name
                        </Text>
                    </View>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.field}>
                        <Text style={styles.label}>SERVER NAME</Text>
                        <CornerBracketBox color={colors.border} size={8}>
                            <TextInput
                                autoCapitalize="none"
                                autoCorrect={false}
                                editable={!loading}
                                onChangeText={(t) => {
                                    setName(t);
                                    setError("");
                                }}
                                placeholder="My server"
                                placeholderTextColor={colors.mutedDark}
                                style={styles.input}
                                value={name}
                            />
                        </CornerBracketBox>
                    </View>

                    <View style={styles.buttonRow}>
                        <VexButton
                            disabled={!name.trim()}
                            glow
                            loading={loading}
                            onPress={handleCreate}
                            title="Create"
                        />
                    </View>
                </View>
            </ScreenLayout>
        );
    }

    // mode === 'join'
    return (
        <ScreenLayout>
            <BackButton
                onPress={() => {
                    setMode("pick");
                    setError("");
                }}
            />
            <View style={styles.content}>
                <View style={styles.header}>
                    <Text style={styles.heading}>Join a server.</Text>
                    <Text style={styles.subtitle}>
                        Enter an invite link or code
                    </Text>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.field}>
                    <Text style={styles.label}>INVITE CODE</Text>
                    <CornerBracketBox color={colors.border} size={8}>
                        <TextInput
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                            onChangeText={(t) => {
                                setInviteInput(t);
                                setError("");
                            }}
                            placeholder="Paste invite link or code"
                            placeholderTextColor={colors.mutedDark}
                            style={styles.input}
                            value={inviteInput}
                        />
                    </CornerBracketBox>
                </View>

                <View style={styles.buttonRow}>
                    <VexButton
                        disabled={!inviteInput.trim()}
                        glow
                        loading={loading}
                        onPress={handleJoin}
                        title="Join"
                    />
                </View>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    buttonRow: {
        alignItems: "center",
    },
    content: {
        flex: 1,
        gap: 24,
        justifyContent: "center",
    },
    errorBox: {
        backgroundColor: "rgba(229, 57, 53, 0.15)",
        borderColor: colors.error,
        borderWidth: 1,
        padding: 10,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
    },
    field: {
        gap: 6,
    },
    header: {
        alignItems: "center",
        gap: 8,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
        textAlign: "center",
    },
    input: {
        backgroundColor: colors.surface,
        color: colors.textSecondary,
        fontSize: 14,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    label: {
        ...typography.label,
        color: colors.muted,
    },
    options: {
        alignItems: "center",
        gap: 12,
    },
    subtitle: {
        ...typography.body,
        color: colors.muted,
        textAlign: "center",
    },
});
