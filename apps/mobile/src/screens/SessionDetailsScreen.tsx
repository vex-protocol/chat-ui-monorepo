import type { AppScreenProps } from "../navigation/types";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $authStatus, $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";
import { getServerUrl } from "../lib/config";
import { colors, typography } from "../theme";

export function SessionDetailsScreen({
    navigation,
}: AppScreenProps<"SessionDetails">) {
    const authStatus = useStore($authStatus);
    const user = useStore($user);
    const [sessionInfo, setSessionInfo] =
        useState<Awaited<ReturnType<typeof vexService.getSessionInfo>>>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const refreshInFlightRef = useRef(false);

    const refreshSession = useCallback(
        async (options?: { silent?: boolean }): Promise<void> => {
            if (refreshInFlightRef.current) {
                return;
            }
            refreshInFlightRef.current = true;
            const silent = options?.silent === true;
            try {
                if (!silent) {
                    setLoading(true);
                }
                setError("");
                const session = await vexService.getSessionInfo();
                setSessionInfo(session);
            } catch (err: unknown) {
                setError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load session details.",
                );
            } finally {
                if (!silent) {
                    setLoading(false);
                }
                refreshInFlightRef.current = false;
            }
        },
        [],
    );

    useEffect(() => {
        if (!user) {
            setSessionInfo(null);
            return;
        }
        void refreshSession();
    }, [refreshSession, user?.userID]);

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.goBack();
                }}
                title="Session"
            />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.rowCard}>
                    <Text style={styles.label}>Auth status</Text>
                    <Text style={styles.value}>{authStatus}</Text>
                </View>
                <View style={styles.rowCard}>
                    <Text style={styles.label}>Server</Text>
                    <Text style={styles.value}>{getServerUrl()}</Text>
                </View>
                <View style={styles.rowCard}>
                    <Text style={styles.label}>Current device</Text>
                    <Text style={[styles.value, styles.mono]}>
                        {sessionInfo?.deviceID?.slice(0, 20) ?? "—"}…
                    </Text>
                </View>
                <View style={styles.rowCard}>
                    <Text style={styles.label}>Session expires</Text>
                    <Text style={styles.value}>
                        {sessionInfo?.tokenExpiresAt
                            ? new Date(
                                  sessionInfo.tokenExpiresAt,
                              ).toLocaleString()
                            : "Unknown"}
                    </Text>
                </View>
                <View style={styles.rowCard}>
                    <Text style={styles.label}>Time remaining</Text>
                    <Text style={styles.value}>
                        {typeof sessionInfo?.tokenRemainingHours === "number"
                            ? `${sessionInfo.tokenRemainingHours}h`
                            : "Unknown"}
                    </Text>
                </View>
                <TouchableOpacity
                    disabled={loading}
                    onPress={() => {
                        void refreshSession();
                    }}
                    style={styles.refreshBtn}
                >
                    <Text style={styles.refreshBtnText}>
                        {loading ? "Loading..." : "Refresh"}
                    </Text>
                </TouchableOpacity>
                {error !== "" ? (
                    <View style={styles.errorCard}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    content: {
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    errorCard: {
        backgroundColor: "rgba(229, 57, 53, 0.14)",
        borderColor: "rgba(229, 57, 53, 0.5)",
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
    },
    label: {
        ...typography.button,
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    mono: {
        fontFamily: typography.body.fontFamily,
        fontSize: 12,
        letterSpacing: 0.25,
    },
    refreshBtn: {
        alignItems: "center",
        borderColor: "rgba(255,255,255,0.2)",
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 68,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    refreshBtnText: {
        ...typography.button,
        color: colors.textSecondary,
        fontWeight: "600",
    },
    rowCard: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderBottomWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 10,
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        justifyContent: "space-between",
        paddingHorizontal: 12,
        paddingVertical: 11,
    },
    value: {
        ...typography.body,
        color: "rgba(255,255,255,0.66)",
        fontSize: 13,
    },
});
