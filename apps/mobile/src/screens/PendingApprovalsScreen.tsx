import type { AppScreenProps } from "../navigation/types";

import React, { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ChatHeader } from "../components/ChatHeader";
import { colors, typography } from "../theme";

export function PendingApprovalsScreen({
    navigation,
}: AppScreenProps<"PendingApprovals">) {
    const user = useStore($user);
    const [deviceRequestBusy, setDeviceRequestBusy] = useState<
        Record<string, boolean>
    >({});
    const [deviceRequestError, setDeviceRequestError] = useState("");
    const [deviceRequests, setDeviceRequests] = useState<
        Awaited<ReturnType<typeof vexService.listPendingDeviceRequests>>
    >([]);
    const [loadingDeviceRequests, setLoadingDeviceRequests] = useState(false);

    const refreshDeviceRequests = useCallback(async (): Promise<void> => {
        if (!user) {
            setDeviceRequests([]);
            return;
        }
        setLoadingDeviceRequests(true);
        setDeviceRequestError("");
        try {
            const requests = await vexService.listPendingDeviceRequests();
            setDeviceRequests(
                requests.filter((request) => request.status === "pending"),
            );
        } catch (err: unknown) {
            setDeviceRequestError(
                err instanceof Error
                    ? err.message
                    : "Failed to load device requests.",
            );
        } finally {
            setLoadingDeviceRequests(false);
        }
    }, [user]);

    useEffect(() => {
        void refreshDeviceRequests();
    }, [refreshDeviceRequests, user?.userID]);

    useEffect(() => {
        const unsubscribe = vexService.onDeviceRequestQueueChanged(() => {
            void refreshDeviceRequests();
        });
        return () => {
            unsubscribe();
        };
    }, [refreshDeviceRequests, user?.userID]);

    async function approveDeviceRequest(requestID: string): Promise<void> {
        setDeviceRequestBusy((prev) => ({ ...prev, [requestID]: true }));
        setDeviceRequestError("");
        try {
            const result = await vexService.approveDeviceRequest(requestID);
            if (!result.ok) {
                setDeviceRequestError(
                    result.error ?? "Failed to approve device request.",
                );
                return;
            }
            await refreshDeviceRequests();
        } finally {
            setDeviceRequestBusy((prev) => ({ ...prev, [requestID]: false }));
        }
    }

    async function rejectDeviceRequest(requestID: string): Promise<void> {
        setDeviceRequestBusy((prev) => ({ ...prev, [requestID]: true }));
        setDeviceRequestError("");
        try {
            const result = await vexService.rejectDeviceRequest(requestID);
            if (!result.ok) {
                setDeviceRequestError(
                    result.error ?? "Failed to reject device request.",
                );
                return;
            }
            await refreshDeviceRequests();
        } finally {
            setDeviceRequestBusy((prev) => ({ ...prev, [requestID]: false }));
        }
    }

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.goBack();
                }}
                title="Pending approvals"
            />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>Device requests</Text>
                            <Text style={styles.desc}>
                                Approve or reject sign-ins from new devices
                            </Text>
                        </View>
                        <TouchableOpacity
                            disabled={loadingDeviceRequests}
                            onPress={() => {
                                void refreshDeviceRequests();
                            }}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>
                                {loadingDeviceRequests
                                    ? "Loading..."
                                    : "Refresh"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {deviceRequestError !== "" ? (
                        <View style={styles.errorCard}>
                            <Text style={styles.errorText}>
                                {deviceRequestError}
                            </Text>
                        </View>
                    ) : null}

                    {deviceRequests.length === 0 && !loadingDeviceRequests ? (
                        <View style={styles.rowCard}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.label}>
                                    No pending requests
                                </Text>
                                <Text style={styles.desc}>
                                    New device sign-in requests will appear
                                    here.
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {deviceRequests.map((req) => {
                        const busy = deviceRequestBusy[req.requestID] === true;
                        return (
                            <View key={req.requestID} style={styles.rowCard}>
                                <View style={styles.rowInfo}>
                                    <Text style={styles.label}>
                                        {req.deviceName}
                                    </Text>
                                    <Text style={styles.desc}>
                                        Request {req.requestID.slice(0, 8)}...
                                    </Text>
                                </View>
                                <View style={styles.inlineActions}>
                                    <TouchableOpacity
                                        disabled={busy}
                                        onPress={() => {
                                            void rejectDeviceRequest(
                                                req.requestID,
                                            );
                                        }}
                                        style={styles.rejectBtn}
                                    >
                                        <Text style={styles.rejectBtnText}>
                                            Reject
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        disabled={busy}
                                        onPress={() => {
                                            void approveDeviceRequest(
                                                req.requestID,
                                            );
                                        }}
                                        style={styles.approveBtn}
                                    >
                                        <Text style={styles.approveBtnText}>
                                            {busy ? "..." : "Approve"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    approveBtn: {
        alignItems: "center",
        borderColor: "rgba(74, 222, 128, 0.45)",
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 74,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    approveBtnText: {
        ...typography.button,
        color: "#4ADE80",
        fontWeight: "600",
    },
    container: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    content: {
        gap: 14,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    desc: {
        ...typography.body,
        color: "rgba(255,255,255,0.52)",
        fontSize: 12,
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
    inlineActions: {
        flexDirection: "row",
        gap: 8,
    },
    label: {
        ...typography.button,
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    rejectBtn: {
        alignItems: "center",
        borderColor: "rgba(255,255,255,0.18)",
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 70,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    rejectBtnText: {
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
    rowInfo: {
        flex: 1,
        gap: 2,
    },
    section: {
        gap: 8,
    },
    testBtn: {
        alignItems: "center",
        borderColor: "rgba(255,255,255,0.2)",
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 68,
        paddingHorizontal: 14,
        paddingVertical: 8,
    },
    testBtnText: {
        ...typography.button,
        color: colors.textSecondary,
        fontWeight: "600",
    },
});
