import type { AuthScreenProps } from "../navigation/types";
import type { Device } from "@vex-chat/libvex";
import type { DeviceApprovalRequest } from "@vex-chat/store";

import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { vexService } from "@vex-chat/store";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { MenuRow, MenuSection } from "../components/MenuRow";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { VexLogo } from "../components/VexLogo";
import { getServerOptions } from "../lib/config";
import { matchingCodeForSignKey } from "../lib/deviceApprovalCode";
import { haptic } from "../lib/haptics";
import {
    authenticatePasskey,
    isPasskeySupported,
    PasskeyCancelledError,
} from "../lib/passkey";
import { mobileConfig } from "../lib/platform";
import { colors, typography } from "../theme";

type Phase = "form" | "manage" | "verifying";

export function PasskeyRecoveryScreen({
    navigation,
    route,
}: AuthScreenProps<"PasskeyRecovery">) {
    const supported = isPasskeySupported();
    const [phase, setPhase] = useState<Phase>("form");
    const [username, setUsername] = useState(route.params?.username ?? "");
    const [error, setError] = useState<null | string>(null);
    const [authenticatedAs, setAuthenticatedAs] = useState<null | string>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const [pending, setPending] = useState<DeviceApprovalRequest[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    const [actionBusy, setActionBusy] = useState<Record<string, boolean>>({});

    const refresh = useCallback(async (silent = false): Promise<void> => {
        if (!silent) {
            setRefreshing(true);
        }
        try {
            const [deviceList, pendingList] = await Promise.all([
                vexService.passkeyListDevices(),
                vexService.listPendingDeviceRequests().catch(() => []),
            ]);
            setDevices(deviceList);
            setPending(
                pendingList.filter((request) => request.status === "pending"),
            );
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : "Could not load devices.",
            );
        } finally {
            if (!silent) {
                setRefreshing(false);
            }
        }
    }, []);

    useEffect(() => {
        if (phase !== "manage") return;
        void refresh(true);
    }, [phase, refresh]);

    async function handleAuthenticate(): Promise<void> {
        const trimmed = username.trim();
        if (trimmed.length === 0) {
            setError("Enter the username for your account.");
            return;
        }
        if (!supported) {
            setError("This device doesn't support passkeys.");
            return;
        }
        setError(null);
        setPhase("verifying");
        haptic("confirm");
        try {
            const begin = await vexService.beginPasskeySignIn(
                trimmed,
                mobileConfig(),
                getServerOptions(),
            );
            const response = await authenticatePasskey(begin.options);
            const finish = await vexService.finishPasskeySignIn({
                requestID: begin.requestID,
                response,
            });
            if (!finish.ok) {
                setError(finish.error ?? "Could not verify the passkey.");
                setPhase("form");
                return;
            }
            setAuthenticatedAs(finish.username ?? trimmed);
            setPhase("manage");
            haptic("confirm");
        } catch (err: unknown) {
            if (err instanceof PasskeyCancelledError) {
                setPhase("form");
                return;
            }
            setError(
                err instanceof Error
                    ? err.message
                    : "Could not verify the passkey.",
            );
            setPhase("form");
        }
    }

    async function handleApprove(requestID: string): Promise<void> {
        haptic("confirm");
        setActionBusy((prev) => ({ ...prev, [requestID]: true }));
        try {
            const result =
                await vexService.passkeyApproveDeviceRequest(requestID);
            if (!result.ok) {
                Alert.alert(
                    "Could not approve",
                    result.error ?? "Unknown error.",
                );
                return;
            }
            await refresh(true);
        } finally {
            setActionBusy((prev) => ({ ...prev, [requestID]: false }));
        }
    }

    async function handleReject(requestID: string): Promise<void> {
        setActionBusy((prev) => ({ ...prev, [requestID]: true }));
        try {
            const result =
                await vexService.passkeyRejectDeviceRequest(requestID);
            if (!result.ok) {
                Alert.alert(
                    "Could not reject",
                    result.error ?? "Unknown error.",
                );
                return;
            }
            await refresh(true);
        } finally {
            setActionBusy((prev) => ({ ...prev, [requestID]: false }));
        }
    }

    function handleDelete(device: Device): void {
        haptic("destructive");
        Alert.alert(
            `Remove "${device.name}"?`,
            "This signs the device out and revokes its access to messages. Anyone using that device will need to re-enroll.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void (async () => {
                            setActionBusy((prev) => ({
                                ...prev,
                                [device.deviceID]: true,
                            }));
                            try {
                                const result =
                                    await vexService.passkeyDeleteDevice(
                                        device.deviceID,
                                    );
                                if (!result.ok) {
                                    Alert.alert(
                                        "Could not remove",
                                        result.error ?? "Unknown error.",
                                    );
                                    return;
                                }
                                await refresh(true);
                            } finally {
                                setActionBusy((prev) => ({
                                    ...prev,
                                    [device.deviceID]: false,
                                }));
                            }
                        })();
                    },
                    style: "destructive",
                    text: "Remove",
                },
            ],
        );
    }

    function handleDone(): void {
        // Tear down the passkey-only client and go back to the
        // account selector. The user can either sign in normally now
        // (if they just approved a fresh device enrollment from
        // another phone) or pick a saved account they still have a
        // device key for.
        void vexService.close().finally(() => {
            navigation.replace("AccountSelector");
        });
    }

    if (phase === "manage") {
        return (
            <ScreenLayout style={styles.layout}>
                <View style={styles.manageHeader}>
                    <VexLogo size={28} />
                    <Text style={styles.heading}>Recovery</Text>
                    <Text style={styles.subtitle}>
                        Signed in as @{authenticatedAs ?? username} via passkey.
                        This session can only manage devices.
                    </Text>
                </View>
                <ScrollView
                    contentContainerStyle={styles.manageContent}
                    refreshControl={
                        <RefreshControl
                            onRefresh={() => {
                                void refresh();
                            }}
                            refreshing={refreshing}
                            tintColor={colors.textSecondary}
                        />
                    }
                >
                    {pending.length > 0 ? (
                        <MenuSection
                            footer="Approve a request to enroll a fresh device — it will be able to sign in normally afterwards."
                            title="Pending device requests"
                        >
                            {pending.map((request) => {
                                const codeChars = matchingCodeForSignKey(
                                    request.signKey,
                                );
                                const busy =
                                    actionBusy[request.requestID] === true;
                                return (
                                    <View
                                        key={request.requestID}
                                        style={styles.pendingCard}
                                    >
                                        <Text style={styles.pendingHeading}>
                                            {request.deviceName}
                                        </Text>
                                        <Text style={styles.matchHint}>
                                            Match this code on the new device:
                                        </Text>
                                        <View style={styles.codeRow}>
                                            {codeChars.map((char, i) => (
                                                <CornerBracketBox
                                                    color={colors.error}
                                                    key={i}
                                                    size={5}
                                                    thickness={1.5}
                                                >
                                                    <View style={styles.cell}>
                                                        <Text
                                                            style={
                                                                styles.cellText
                                                            }
                                                        >
                                                            {char}
                                                        </Text>
                                                    </View>
                                                </CornerBracketBox>
                                            ))}
                                        </View>
                                        <View style={styles.inlineActions}>
                                            <TouchableOpacity
                                                disabled={busy}
                                                onPress={() => {
                                                    void handleReject(
                                                        request.requestID,
                                                    );
                                                }}
                                                style={styles.rejectBtn}
                                            >
                                                <Text
                                                    style={styles.rejectBtnText}
                                                >
                                                    Reject
                                                </Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                disabled={busy}
                                                onPress={() => {
                                                    void handleApprove(
                                                        request.requestID,
                                                    );
                                                }}
                                                style={styles.approveBtn}
                                            >
                                                <Text
                                                    style={
                                                        styles.approveBtnText
                                                    }
                                                >
                                                    {busy ? "..." : "Approve"}
                                                </Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })}
                        </MenuSection>
                    ) : null}

                    <MenuSection
                        footer={
                            devices.length === 1
                                ? "Your last remaining device cannot be removed."
                                : "Long-press a device to remove it."
                        }
                        title="Your devices"
                    >
                        {devices.length === 0 && !refreshing ? (
                            <MenuRow
                                description="Pull to refresh"
                                icon="cloud-offline-outline"
                                label="No devices"
                            />
                        ) : null}
                        {devices.map((device) => {
                            const lastLoginLabel = `Last login ${new Date(
                                device.lastLogin,
                            ).toLocaleString()}`;
                            const removable = devices.length > 1;
                            return (
                                <MenuRow
                                    description={lastLoginLabel}
                                    icon="phone-portrait-outline"
                                    key={device.deviceID}
                                    label={device.name}
                                    onPress={() => {
                                        if (removable) {
                                            handleDelete(device);
                                        } else {
                                            Alert.alert(
                                                "Last device",
                                                "You can't remove your only remaining device — that would lock you out. Add another device first.",
                                            );
                                        }
                                    }}
                                    showChevron
                                />
                            );
                        })}
                    </MenuSection>

                    <View style={styles.doneBlock}>
                        <VexButton
                            onPress={handleDone}
                            style={styles.doneButton}
                            title="Done"
                            variant="outline"
                        />
                    </View>
                </ScrollView>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout>
            <BackButton />
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.formWrap}
            >
                <View style={styles.formHeader}>
                    <VexLogo size={36} />
                    <Text style={styles.heading}>Sign in with a passkey</Text>
                    <Text style={styles.subtitle}>
                        Enter the username for your account, then tap Continue
                        and approve the system prompt with Face ID, Touch ID, or
                        your security key.
                    </Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.formLabel}>Username</Text>
                    <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={phase !== "verifying"}
                        maxLength={64}
                        onChangeText={(text) => {
                            setUsername(text);
                            setError(null);
                        }}
                        placeholder="@you"
                        placeholderTextColor="rgba(255,255,255,0.32)"
                        returnKeyType="done"
                        style={styles.formInput}
                        value={username}
                    />
                    {error ? (
                        <Text style={styles.formError}>{error}</Text>
                    ) : null}
                    {!supported ? (
                        <Text style={styles.formError}>
                            Passkeys aren&apos;t available on this device. iOS
                            16+ or Android 9+ with a screen lock is required.
                        </Text>
                    ) : null}
                </View>

                <View style={styles.actions}>
                    {phase === "verifying" ? (
                        <View style={styles.busyRow}>
                            <ActivityIndicator
                                animating
                                color={colors.muted}
                                size="small"
                            />
                            <Text style={styles.busyText}>
                                Waiting for passkey approval...
                            </Text>
                        </View>
                    ) : (
                        <VexButton
                            disabled={!supported}
                            glow
                            onPress={() => {
                                void handleAuthenticate();
                            }}
                            style={styles.actionButton}
                            title="Continue"
                            variant="primary"
                        />
                    )}
                </View>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    actionButton: {
        width: "100%",
    },
    actions: {
        gap: 12,
        marginTop: 8,
        paddingHorizontal: 12,
    },
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
    busyRow: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    busyText: {
        ...typography.body,
        color: colors.textSecondary,
        flex: 1,
    },
    cell: {
        alignItems: "center",
        backgroundColor: "rgba(229, 57, 53, 0.08)",
        borderColor: "rgba(229, 57, 53, 0.4)",
        borderWidth: 1,
        height: 52,
        justifyContent: "center",
        width: 44,
    },
    cellText: {
        ...typography.button,
        color: colors.text,
        fontSize: 22,
        letterSpacing: 1,
    },
    codeRow: {
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        paddingVertical: 6,
    },
    doneBlock: {
        alignItems: "center",
        gap: 12,
        paddingVertical: 16,
    },
    doneButton: {
        width: "100%",
    },
    formCard: {
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 10,
        borderWidth: 1,
        gap: 8,
        marginHorizontal: 12,
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    formError: {
        ...typography.body,
        color: colors.error,
        fontSize: 12,
    },
    formHeader: {
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 24,
    },
    formInput: {
        ...typography.body,
        backgroundColor: "rgba(0,0,0,0.32)",
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 8,
        borderWidth: 1,
        color: colors.text,
        paddingHorizontal: 10,
        paddingVertical: 9,
    },
    formLabel: {
        ...typography.label,
        color: "rgba(255,255,255,0.5)",
        textTransform: "uppercase",
    },
    formWrap: {
        flex: 1,
        justifyContent: "center",
    },
    heading: {
        ...typography.heading,
        color: colors.text,
        fontSize: 24,
        textAlign: "center",
    },
    inlineActions: {
        flexDirection: "row",
        gap: 8,
        justifyContent: "flex-end",
    },
    layout: {
        backgroundColor: colors.bg,
    },
    manageContent: {
        gap: 18,
        paddingBottom: 40,
        paddingHorizontal: 14,
        paddingTop: 8,
    },
    manageHeader: {
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    matchHint: {
        ...typography.body,
        color: "rgba(255,255,255,0.62)",
        fontSize: 12,
    },
    pendingCard: {
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 10,
        borderWidth: 1,
        gap: 10,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    pendingHeading: {
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
    subtitle: {
        ...typography.body,
        color: colors.muted,
        fontSize: 13,
        textAlign: "center",
    },
});
