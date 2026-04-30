import type { AppScreenProps } from "../navigation/types";
import type { Invite } from "@vex-chat/libvex";

import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    FlatList,
    Share,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { vexService } from "@vex-chat/store";

import { ChatHeader } from "../components/ChatHeader";
import { colors, fontFamilies, typography } from "../theme";

const DURATIONS: { label: string; value: string }[] = [
    { label: "1 hour", value: "1h" },
    { label: "1 day", value: "1d" },
    { label: "7 days", value: "7d" },
    { label: "30 days", value: "30d" },
];

const INVITE_URL_BASE = "https://vex.chat/invite";

export function InviteScreen({ route }: AppScreenProps<"Invite">) {
    const { serverID, serverName } = route.params;
    const [duration, setDuration] = useState("7d");
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loadingInvites, setLoadingInvites] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    async function loadInvites(): Promise<void> {
        setLoadingInvites(true);
        try {
            const loaded = await vexService.getInvites(serverID);
            setInvites(loaded);
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : "Failed to load invites",
            );
        } finally {
            setLoadingInvites(false);
        }
    }

    useEffect(() => {
        void loadInvites();
        // serverID changes only when navigating to a different server invite screen
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverID]);

    async function handleCreateInvite(): Promise<void> {
        setCreating(true);
        setError("");
        try {
            const result = await vexService.createInvite(serverID, duration);
            setInvites((prev) => [result, ...prev]);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create");
        } finally {
            setCreating(false);
        }
    }

    function copy(text: string, label: string): void {
        // eslint-disable-next-line @typescript-eslint/no-deprecated -- RN Clipboard is the supported API on bare app
        Clipboard.setString(text);
        Alert.alert("Copied", `${label} copied to clipboard.`);
    }

    async function handleShare(link: string): Promise<void> {
        try {
            await Share.share({
                message: `Join ${serverName ?? "my server"} on Vex: ${link}`,
            });
        } catch {
            /* user cancelled */
        }
    }

    return (
        <View style={styles.container}>
            <ChatHeader title={`Invite to ${serverName ?? "server"}`} />
            <View style={styles.body}>
                <Text style={styles.label}>Create invite</Text>
                <View style={styles.durationRow}>
                    {DURATIONS.map((d) => {
                        const selected = duration === d.value;
                        return (
                            <TouchableOpacity
                                key={d.value}
                                onPress={() => {
                                    setDuration(d.value);
                                }}
                                style={[
                                    styles.durationChip,
                                    selected && styles.durationChipActive,
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.durationLabel,
                                        selected && styles.durationLabelActive,
                                    ]}
                                >
                                    {d.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
                <View style={styles.actions}>
                    <TouchableOpacity
                        disabled={creating}
                        onPress={() => void handleCreateInvite()}
                        style={[styles.btn, styles.btnPrimary]}
                    >
                        {creating ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text
                                style={[styles.btnText, styles.btnPrimaryText]}
                            >
                                Create invite link
                            </Text>
                        )}
                    </TouchableOpacity>
                    <TouchableOpacity
                        disabled={loadingInvites}
                        onPress={() => {
                            void loadInvites();
                        }}
                        style={styles.btn}
                    >
                        <Text style={styles.btnText}>
                            {loadingInvites ? "Refreshing..." : "Refresh list"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <Text style={[styles.label, styles.listLabel]}>
                    Active invites
                </Text>
                {loadingInvites ? (
                    <ActivityIndicator color={colors.textSecondary} />
                ) : invites.length === 0 ? (
                    <Text style={styles.resetText}>
                        No active invite links yet.
                    </Text>
                ) : (
                    <FlatList
                        data={invites}
                        keyExtractor={(item) => item.inviteID}
                        renderItem={({ item }) => {
                            const link = buildInviteLink(item.inviteID);
                            return (
                                <View style={styles.inviteCard}>
                                    <Text
                                        numberOfLines={1}
                                        style={styles.fieldValue}
                                    >
                                        {link}
                                    </Text>
                                    <Text style={styles.expires}>
                                        Expires{" "}
                                        {new Date(
                                            item.expiration,
                                        ).toLocaleString()}
                                    </Text>
                                    <View style={styles.actions}>
                                        <TouchableOpacity
                                            onPress={() =>
                                                copy(link, "Invite link")
                                            }
                                            style={styles.btn}
                                        >
                                            <Text style={styles.btnText}>
                                                Copy link
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                copy(
                                                    item.inviteID,
                                                    "Invite code",
                                                )
                                            }
                                            style={styles.btn}
                                        >
                                            <Text style={styles.btnText}>
                                                Copy code
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                void handleShare(link)
                                            }
                                            style={[
                                                styles.btn,
                                                styles.btnPrimary,
                                            ]}
                                        >
                                            <Text
                                                style={[
                                                    styles.btnText,
                                                    styles.btnPrimaryText,
                                                ]}
                                            >
                                                Share
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            );
                        }}
                    />
                )}
                {error !== "" && <Text style={styles.error}>{error}</Text>}
            </View>
        </View>
    );
}

function buildInviteLink(inviteID: string): string {
    return `${INVITE_URL_BASE}/${inviteID}`;
}

const styles = StyleSheet.create({
    actions: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginTop: 16,
    },
    body: { flex: 1, padding: 16 },
    btn: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.borderSubtle,
        borderRadius: 6,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    btnPrimary: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    btnPrimaryText: { color: "#FFFFFF" },
    btnText: { ...typography.button, color: colors.text },
    container: { backgroundColor: colors.bg, flex: 1 },
    durationChip: {
        backgroundColor: colors.surface,
        borderColor: colors.borderSubtle,
        borderRadius: 6,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    durationChipActive: {
        backgroundColor: colors.accent,
        borderColor: colors.accent,
    },
    durationLabel: { ...typography.body, color: colors.text },
    durationLabelActive: { color: "#FFFFFF", fontWeight: "600" },
    durationRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 16,
        marginTop: 8,
    },
    error: { color: colors.accent, marginBottom: 12 },
    expires: {
        ...typography.body,
        color: colors.muted,
        fontSize: 12,
        marginTop: 8,
    },
    field: {
        backgroundColor: colors.surface,
        borderColor: colors.borderSubtle,
        borderRadius: 6,
        borderWidth: 1,
        marginBottom: 12,
        marginTop: 4,
        padding: 12,
    },
    fieldValue: { ...typography.body, color: colors.text },
    inviteCard: {
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: colors.borderSubtle,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 10,
        padding: 10,
    },
    label: { ...typography.label, color: colors.muted, fontSize: 12 },
    listLabel: { marginTop: 12 },
    mono: { fontFamily: fontFamilies.mono },
    resetBtn: { alignItems: "center", marginTop: 24, padding: 8 },
    resetText: { color: colors.muted },
    submit: { alignSelf: "stretch", marginTop: 8 },
});
