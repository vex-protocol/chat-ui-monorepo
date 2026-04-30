import type { AppScreenProps } from "../navigation/types";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $authStatus, $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ApprovalCodeDisplay } from "../components/ApprovalCodeDisplay";
import { ChatHeader } from "../components/ChatHeader";
import { getServerUrl } from "../lib/config";
import { approvalCodeForRequest } from "../lib/deviceApprovalCode";
import { colors, typography } from "../theme";

export function PendingApprovalsScreen({
    navigation,
}: AppScreenProps<"Devices">) {
    const authStatus = useStore($authStatus);
    const user = useStore($user);
    const [deviceBusyByID, setDeviceBusyByID] = useState<
        Record<string, boolean>
    >({});
    const [deviceError, setDeviceError] = useState("");
    const [devices, setDevices] = useState<
        Awaited<ReturnType<typeof vexService.listMyDevices>>
    >([]);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [deviceRequestBusy, setDeviceRequestBusy] = useState<
        Record<string, boolean>
    >({});
    const [deviceRequestError, setDeviceRequestError] = useState("");
    const [deviceRequests, setDeviceRequests] = useState<
        Awaited<ReturnType<typeof vexService.listPendingDeviceRequests>>
    >([]);
    const [sessionInfo, setSessionInfo] =
        useState<Awaited<ReturnType<typeof vexService.getSessionInfo>>>(null);
    const [loadingDeviceRequests, setLoadingDeviceRequests] = useState(false);
    const deviceRequestsRefreshInFlightRef = useRef(false);
    const devicesRefreshInFlightRef = useRef(false);

    const refreshDeviceRequests = useCallback(
        async (options?: { silent?: boolean }): Promise<void> => {
            if (deviceRequestsRefreshInFlightRef.current) {
                return;
            }
            deviceRequestsRefreshInFlightRef.current = true;
            const silent = options?.silent === true;
            try {
                if (!user) {
                    setDeviceRequests([]);
                    return;
                }
                if (!silent) {
                    setLoadingDeviceRequests(true);
                }
                setDeviceRequestError("");
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
                if (!silent) {
                    setLoadingDeviceRequests(false);
                }
                deviceRequestsRefreshInFlightRef.current = false;
            }
        },
        [user],
    );

    const refreshSessionAndDevices = useCallback(
        async (options?: { silent?: boolean }) => {
            if (devicesRefreshInFlightRef.current) {
                return;
            }
            devicesRefreshInFlightRef.current = true;
            const silent = options?.silent === true;
            try {
                if (!silent) {
                    setDevicesLoading(true);
                }
                setDeviceError("");
                const [session, myDevices] = await Promise.all([
                    vexService.getSessionInfo(),
                    vexService.listMyDevices(),
                ]);
                setSessionInfo(session);
                setDevices(myDevices);
            } catch (err: unknown) {
                setDeviceError(
                    err instanceof Error
                        ? err.message
                        : "Failed to load device/session details.",
                );
            } finally {
                if (!silent) {
                    setDevicesLoading(false);
                }
                devicesRefreshInFlightRef.current = false;
            }
        },
        [],
    );

    useEffect(() => {
        void refreshDeviceRequests();
    }, [refreshDeviceRequests, user?.userID]);

    useEffect(() => {
        if (!user) {
            setSessionInfo(null);
            setDevices([]);
            return;
        }
        void refreshSessionAndDevices();
        // Depend on stable user identity only; full user object changes after whoami
        // would retrigger this and cause rapid refresh flicker.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshSessionAndDevices, user?.userID]);

    useEffect(() => {
        const unsubscribe = vexService.onDeviceRequestQueueChanged(() => {
            void refreshDeviceRequests({ silent: true });
            void refreshSessionAndDevices({ silent: true });
        });
        return () => {
            unsubscribe();
        };
    }, [refreshDeviceRequests, refreshSessionAndDevices, user?.userID]);

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
            await refreshSessionAndDevices();
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

    function handleRemoveDevice(deviceID: string, deviceName: string): void {
        Alert.alert(
            `Remove ${deviceName}?`,
            "This device will be signed out and must be re-approved or re-authenticated.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void removeDevice(deviceID);
                    },
                    style: "destructive",
                    text: "Remove",
                },
            ],
        );
    }

    async function removeDevice(deviceID: string): Promise<void> {
        setDeviceBusyByID((prev) => ({ ...prev, [deviceID]: true }));
        setDeviceError("");
        try {
            const result = await vexService.removeDevice(deviceID);
            if (!result.ok) {
                setDeviceError(result.error ?? "Failed to remove device.");
                return;
            }
            await refreshSessionAndDevices();
        } finally {
            setDeviceBusyByID((prev) => ({ ...prev, [deviceID]: false }));
        }
    }

    const currentDeviceID = sessionInfo?.deviceID;

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.goBack();
                }}
                title="Devices"
            />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Pending approvals</Text>
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
                                    <ApprovalCodeDisplay
                                        code={approvalCodeForRequest(req)}
                                        compact
                                        helperText="Confirm this code matches on the new device."
                                    />
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

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Session</Text>

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
                            {typeof sessionInfo?.tokenRemainingHours ===
                            "number"
                                ? `${sessionInfo.tokenRemainingHours}h`
                                : "Unknown"}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Current devices</Text>

                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>Your devices</Text>
                            <Text style={styles.desc}>
                                Remove old devices you no longer use
                            </Text>
                            {devices.length <= 1 ? (
                                <Text style={styles.desc}>
                                    Your last remaining device cannot be
                                    removed.
                                </Text>
                            ) : null}
                        </View>
                        <TouchableOpacity
                            disabled={devicesLoading}
                            onPress={() => {
                                void refreshSessionAndDevices();
                            }}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>
                                {devicesLoading ? "Loading..." : "Refresh"}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {deviceError !== "" ? (
                        <View style={styles.errorCard}>
                            <Text style={styles.errorText}>{deviceError}</Text>
                        </View>
                    ) : null}

                    {devices.map((device) => {
                        const isCurrent = device.deviceID === currentDeviceID;
                        const canRemove = devices.length > 1;
                        const busy = deviceBusyByID[device.deviceID] === true;
                        return (
                            <View key={device.deviceID} style={styles.rowCard}>
                                <View style={styles.rowInfo}>
                                    <Text style={styles.label}>
                                        {device.name}
                                    </Text>
                                    <Text style={styles.desc}>
                                        Last login{" "}
                                        {new Date(
                                            device.lastLogin,
                                        ).toLocaleString()}
                                    </Text>
                                    <Text style={[styles.desc, styles.mono]}>
                                        {device.deviceID.slice(0, 20)}…
                                    </Text>
                                </View>
                                {isCurrent ? (
                                    <View style={styles.currentDeviceBadge}>
                                        <Text
                                            style={
                                                styles.currentDeviceBadgeText
                                            }
                                        >
                                            This device
                                        </Text>
                                    </View>
                                ) : !canRemove ? (
                                    <View style={styles.currentDeviceBadge}>
                                        <Text
                                            style={
                                                styles.currentDeviceBadgeText
                                            }
                                        >
                                            Last device
                                        </Text>
                                    </View>
                                ) : (
                                    <TouchableOpacity
                                        disabled={busy}
                                        onPress={() => {
                                            handleRemoveDevice(
                                                device.deviceID,
                                                device.name,
                                            );
                                        }}
                                        style={styles.removeDeviceBtn}
                                    >
                                        <Text
                                            style={styles.removeDeviceBtnText}
                                        >
                                            {busy ? "Removing..." : "Remove"}
                                        </Text>
                                    </TouchableOpacity>
                                )}
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
    currentDeviceBadge: {
        backgroundColor: "rgba(74, 222, 128, 0.14)",
        borderColor: "rgba(74, 222, 128, 0.4)",
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    currentDeviceBadgeText: {
        ...typography.button,
        color: "#8DF5B0",
        fontSize: 12,
        fontWeight: "600",
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
    mono: {
        fontFamily: typography.body.fontFamily,
        fontSize: 12,
        letterSpacing: 0.25,
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
    removeDeviceBtn: {
        alignItems: "center",
        borderColor: "rgba(229, 57, 53, 0.4)",
        borderRadius: 10,
        borderWidth: 1,
        minWidth: 86,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    removeDeviceBtnText: {
        ...typography.button,
        color: colors.error,
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
    sectionTitle: {
        ...typography.label,
        color: "rgba(255,255,255,0.52)",
        paddingHorizontal: 2,
        textTransform: "uppercase",
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
    value: {
        ...typography.body,
        color: "rgba(255,255,255,0.66)",
        fontSize: 13,
    },
});
