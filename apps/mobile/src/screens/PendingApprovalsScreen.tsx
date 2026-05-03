import type { AppScreenProps } from "../navigation/types";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { useFocusEffect } from "@react-navigation/native";

import { ChatHeader } from "../components/ChatHeader";
import { colors, typography } from "../theme";

export function PendingApprovalsScreen({
    navigation,
}: AppScreenProps<"Devices">) {
    const user = useStore($user);
    const [deviceError, setDeviceError] = useState("");
    const [devices, setDevices] = useState<
        Awaited<ReturnType<typeof vexService.listMyDevices>>
    >([]);
    const [devicesLoading, setDevicesLoading] = useState(false);
    const [sessionInfo, setSessionInfo] =
        useState<Awaited<ReturnType<typeof vexService.getSessionInfo>>>(null);
    const devicesRefreshInFlightRef = useRef(false);

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
            void refreshSessionAndDevices({ silent: true });
        });
        return () => {
            unsubscribe();
        };
    }, [refreshSessionAndDevices, user?.userID]);

    const currentDeviceID = sessionInfo?.deviceID;

    useFocusEffect(
        useCallback(() => {
            if (!user) {
                return;
            }
            void refreshSessionAndDevices({ silent: true });
        }, [refreshSessionAndDevices, user]),
    );

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
                    <Text style={styles.sectionTitle}>Current Devices</Text>

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
                        return (
                            <TouchableOpacity
                                key={device.deviceID}
                                onPress={() => {
                                    navigation.navigate("DeviceDetails", {
                                        deviceID: device.deviceID,
                                        deviceName: device.name,
                                    });
                                }}
                                style={styles.rowCard}
                            >
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
                                ) : devices.length <= 1 ? (
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
                                    <View style={styles.manageBadge}>
                                        <Text style={styles.manageBadgeText}>
                                            Open
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Device Tools</Text>
                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>Device requests</Text>
                            <Text style={styles.desc}>
                                Review and approve sign-ins from new devices.
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate("DeviceRequests");
                            }}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>Open</Text>
                        </TouchableOpacity>
                    </View>
                </View>
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
    label: {
        ...typography.button,
        color: colors.textSecondary,
        fontSize: 14,
        fontWeight: "600",
    },
    manageBadge: {
        alignItems: "center",
        borderColor: "rgba(255,255,255,0.24)",
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    manageBadgeText: {
        ...typography.button,
        color: "rgba(255,255,255,0.84)",
        fontSize: 12,
        fontWeight: "600",
    },
    mono: {
        fontFamily: typography.body.fontFamily,
        fontSize: 12,
        letterSpacing: 0.25,
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
});
