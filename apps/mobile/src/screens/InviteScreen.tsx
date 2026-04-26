import type { AppScreenProps } from "../navigation/types";
import type { Invite } from "@vex-chat/libvex";

import React, { useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Clipboard,
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
    const [invite, setInvite] = useState<Invite | null>(null);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    async function handleCreate(): Promise<void> {
        setCreating(true);
        setError("");
        try {
            const result = await vexService.createInvite(serverID, duration);
            setInvite(result);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Failed to create");
        }
        setCreating(false);
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

            {invite ? (
                <View style={styles.body}>
                    <Text style={styles.label}>Invite link</Text>
                    <View style={styles.field}>
                        <Text numberOfLines={1} style={styles.fieldValue}>
                            {buildInviteLink(invite.inviteID)}
                        </Text>
                    </View>

                    <Text style={styles.label}>Invite code</Text>
                    <View style={styles.field}>
                        <Text
                            numberOfLines={1}
                            style={[styles.fieldValue, styles.mono]}
                        >
                            {invite.inviteID}
                        </Text>
                    </View>

                    <Text style={styles.expires}>
                        Expires {new Date(invite.expiration).toLocaleString()}
                    </Text>

                    <View style={styles.actions}>
                        <TouchableOpacity
                            onPress={() =>
                                copy(
                                    buildInviteLink(invite.inviteID),
                                    "Invite link",
                                )
                            }
                            style={styles.btn}
                        >
                            <Text style={styles.btnText}>Copy link</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => copy(invite.inviteID, "Invite code")}
                            style={styles.btn}
                        >
                            <Text style={styles.btnText}>Copy code</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() =>
                                void handleShare(
                                    buildInviteLink(invite.inviteID),
                                )
                            }
                            style={[styles.btn, styles.btnPrimary]}
                        >
                            <Text
                                style={[styles.btnText, styles.btnPrimaryText]}
                            >
                                Share…
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        onPress={() => {
                            setInvite(null);
                            setError("");
                        }}
                        style={styles.resetBtn}
                    >
                        <Text style={styles.resetText}>Create another</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.body}>
                    <Text style={styles.label}>Expires in</Text>
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
                                            selected &&
                                                styles.durationLabelActive,
                                        ]}
                                    >
                                        {d.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {error !== "" && <Text style={styles.error}>{error}</Text>}

                    <TouchableOpacity
                        disabled={creating}
                        onPress={() => void handleCreate()}
                        style={[styles.btn, styles.btnPrimary, styles.submit]}
                    >
                        {creating ? (
                            <ActivityIndicator color="#FFFFFF" />
                        ) : (
                            <Text
                                style={[styles.btnText, styles.btnPrimaryText]}
                            >
                                Generate invite
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            )}
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
    label: { ...typography.label, color: colors.muted, fontSize: 12 },
    mono: { fontFamily: fontFamilies.mono },
    resetBtn: { alignItems: "center", marginTop: 24, padding: 8 },
    resetText: { color: colors.muted },
    submit: { alignSelf: "stretch", marginTop: 8 },
});
