import type { AppScreenProps } from "../navigation/types";

import React, { useCallback, useEffect, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { vexService } from "@vex-chat/store";

import { ChatHeader } from "../components/ChatHeader";
import { colors, typography } from "../theme";

type DeviceRecord = Awaited<
    ReturnType<typeof vexService.listMyDevices>
>[number];

export function DeviceDetailsScreen({
    navigation,
    route,
}: AppScreenProps<"DeviceDetails">) {
    const [device, setDevice] = useState<DeviceRecord | null>(null);
    const [currentDeviceID, setCurrentDeviceID] = useState<null | string>(null);
    const [deviceCount, setDeviceCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const refresh = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const [session, devices] = await Promise.all([
                vexService.getSessionInfo(),
                vexService.listMyDevices(),
            ]);
            setCurrentDeviceID(session?.deviceID ?? null);
            setDeviceCount(devices.length);
            const match =
                devices.find(
                    (entry) => entry.deviceID === route.params.deviceID,
                ) ?? null;
            setDevice(match);
            if (!match) {
                setError("Device no longer exists.");
            }
        } catch (err: unknown) {
            setError(
                err instanceof Error
                    ? err.message
                    : "Failed to load device details.",
            );
        } finally {
            setLoading(false);
        }
    }, [route.params.deviceID]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const isCurrent = device?.deviceID === currentDeviceID;
    const canRemove = Boolean(device) && !isCurrent && deviceCount > 1;

    async function handleRemove(): Promise<void> {
        if (!device || !canRemove || busy) {
            return;
        }
        setBusy(true);
        setError("");
        try {
            const result = await vexService.removeDevice(device.deviceID);
            if (!result.ok) {
                setError(result.error ?? "Failed to remove device.");
                return;
            }
            navigation.goBack();
        } finally {
            setBusy(false);
        }
    }

    const title = device?.name ?? route.params.deviceName ?? "Device details";

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.goBack();
                }}
                title={title}
            />
            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Details</Text>
                    <View style={styles.rowCard}>
                        <Text style={styles.label}>Name</Text>
                        <Text style={styles.value}>
                            {device?.name ??
                                route.params.deviceName ??
                                "Unknown"}
                        </Text>
                    </View>
                    <View style={styles.rowCard}>
                        <Text style={styles.label}>Device ID</Text>
                        <Text style={[styles.value, styles.mono]}>
                            {device?.deviceID ?? route.params.deviceID}
                        </Text>
                    </View>
                    <View style={styles.rowCard}>
                        <Text style={styles.label}>Last login</Text>
                        <Text style={styles.value}>
                            {device?.lastLogin
                                ? new Date(device.lastLogin).toLocaleString()
                                : "Unknown"}
                        </Text>
                    </View>
                    <View style={styles.rowCard}>
                        <Text style={styles.label}>Current device</Text>
                        <Text style={styles.value}>
                            {isCurrent ? "Yes" : "No"}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Actions</Text>
                    {isCurrent ? (
                        <Text style={styles.helperText}>
                            You cannot remove the device currently in use.
                        </Text>
                    ) : null}
                    {!isCurrent && deviceCount <= 1 ? (
                        <Text style={styles.helperText}>
                            You cannot remove your last remaining device.
                        </Text>
                    ) : null}
                    <TouchableOpacity
                        disabled={!canRemove || busy || loading}
                        onPress={() => {
                            void handleRemove();
                        }}
                        style={[
                            styles.removeBtn,
                            (!canRemove || busy || loading) &&
                                styles.removeBtnDisabled,
                        ]}
                    >
                        <Text style={styles.removeBtnText}>
                            {busy ? "Removing..." : "Remove device"}
                        </Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    disabled={loading}
                    onPress={() => {
                        void refresh();
                    }}
                    style={styles.refreshBtn}
                >
                    <Text style={styles.refreshBtnText}>
                        {loading ? "Loading..." : "Refresh details"}
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
        gap: 14,
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
    helperText: {
        ...typography.body,
        color: "rgba(255,255,255,0.62)",
        fontSize: 12,
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
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    refreshBtnText: {
        ...typography.button,
        color: colors.textSecondary,
        fontWeight: "600",
    },
    removeBtn: {
        alignItems: "center",
        backgroundColor: "rgba(229, 57, 53, 0.2)",
        borderColor: "rgba(229, 57, 53, 0.55)",
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    removeBtnDisabled: {
        opacity: 0.5,
    },
    removeBtnText: {
        ...typography.button,
        color: "#F9B4B2",
        fontWeight: "600",
    },
    rowCard: {
        backgroundColor: "rgba(255,255,255,0.02)",
        borderBottomWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 11,
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
    value: {
        ...typography.body,
        color: "rgba(255,255,255,0.66)",
        fontSize: 13,
    },
});
