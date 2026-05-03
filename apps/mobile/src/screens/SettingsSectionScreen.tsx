import type { AppScreenProps } from "../navigation/types";

import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

import { $user, vexService } from "@vex-chat/store";
import { $avatarHash, avatarHue } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import { AndroidImportance } from "expo-notifications";

import { ChatHeader } from "../components/ChatHeader";
import { getServerOptions, getServerUrl } from "../lib/config";
import { loadCredentials } from "../lib/keychain";
import { colors, typography } from "../theme";

export function SettingsSectionScreen({
    navigation,
    route,
}: AppScreenProps<"SettingsSection">) {
    const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
    const avatarHash = useStore($avatarHash);
    const user = useStore($user);
    const section = route.params.section;
    const [avatarError, setAvatarError] = useState("");
    const [avatarLastAttemptBytes, setAvatarLastAttemptBytes] = useState<
        null | number
    >(null);
    const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);
    const [avatarNotice, setAvatarNotice] = useState("");
    const [avatarUploading, setAvatarUploading] = useState(false);
    const [exportingIdentity, setExportingIdentity] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const [wsDebugEnabled, setWsDebugEnabled] = useState(() =>
        vexService.getWebsocketDebugEnabled(),
    );
    const [wsFrameDebugEnabled, setWsFrameDebugEnabled] = useState(() =>
        vexService.getWebsocketFrameDebugEnabled(),
    );
    const [wsStateDebugEnabled, setWsStateDebugEnabled] = useState(() =>
        vexService.getWebsocketStateDebugEnabled(),
    );
    const avatarUrl =
        user?.userID != null
            ? `${getServerOptions().unsafeHttp ? "http" : "https"}://${getServerUrl()}/avatar/${user.userID}?v=${avatarHash}`
            : null;

    useEffect(() => {
        setAvatarLoadFailed(false);
    }, [avatarUrl]);

    const title = useMemo(() => {
        switch (section) {
            case "about":
                return "About";
            case "account":
                return "Account";
            case "data":
                return "Data";
            case "developer":
                return "Developer";
            case "notifications":
                return "Notifications";
            default:
                return "Settings";
        }
    }, [section]);

    function handleExportIdentityKey(): void {
        Alert.alert(
            "Export identity key?",
            "Store this securely. Anyone with this key can access your account on this server.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void exportIdentityKey();
                    },
                    text: "Export",
                },
            ],
        );
    }

    function handleLogout(): void {
        Alert.alert(
            "Sign out?",
            "Your messages stay encrypted on this device. You can sign back in anytime.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        setLoggingOut(true);
                        void vexService.logout().catch(() => {
                            /* ignore */
                        });
                    },
                    style: "destructive",
                    text: "Sign out",
                },
            ],
        );
    }

    function handleResetUnreadCounts(): void {
        Alert.alert(
            "Reset unread counters?",
            "This only resets local unread badges on this device.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        vexService.resetAllUnread();
                        Alert.alert("Done", "Unread counters have been reset.");
                    },
                    text: "Reset",
                },
            ],
        );
    }

    async function exportIdentityKey(): Promise<void> {
        const username = user?.username;
        if (!username) {
            Alert.alert("Export failed", "No active account found.");
            return;
        }
        setExportingIdentity(true);
        try {
            const creds = await loadCredentials(username);
            if (!creds?.deviceKey) {
                Alert.alert(
                    "Export failed",
                    "No identity key is saved for this account on this device.",
                );
                return;
            }
            const exportText = [
                "# Vex identity key backup",
                `server: ${getServerUrl()}`,
                `username: ${creds.username}`,
                `deviceID: ${creds.deviceID}`,
                `identityKey: ${creds.deviceKey}`,
            ].join("\n");

            await Share.share({
                message: exportText,
                title: "Vex identity key backup",
            });
        } catch (err: unknown) {
            Alert.alert(
                "Export failed",
                err instanceof Error ? err.message : "Unexpected export error.",
            );
        } finally {
            setExportingIdentity(false);
        }
    }

    function handleSendTestNotification(): void {
        void (async () => {
            await Notifications.setNotificationChannelAsync("vex-messages", {
                importance: AndroidImportance.HIGH,
                name: "Messages",
            });
            await Notifications.scheduleNotificationAsync({
                content: {
                    body: "This is a test notification from Vex.",
                    data: {
                        authorID: "test",
                        username: "Test User",
                    },
                    title: "Test User",
                },
                trigger: { channelId: "vex-messages" },
            });
        })();
    }

    function initials(id: string, displayName?: string): string {
        if (displayName) return displayName.slice(0, 2).toUpperCase();
        return id.slice(0, 2).toUpperCase();
    }

    function formatBytes(bytes: number): string {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    }

    function readImageBytesFromBase64(base64Data: string): Uint8Array {
        const decode = globalThis.atob;
        if (typeof decode !== "function") {
            throw new Error("Base64 decoder is unavailable on this device.");
        }
        const binary = decode(base64Data.replace(/\s+/g, ""));
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
    }

    async function compressAvatarToLimit(
        sourceUri: string,
        maxBytes: number,
    ): Promise<{ data: null | Uint8Array; lastAttemptBytes: null | number }> {
        const TARGET_DIMENSION = 500;
        const QUALITY_STEPS: ReadonlyArray<number> = [0.34, 0.28, 0.22, 0.16];
        let lastAttemptBytes: null | number = null;

        for (const quality of QUALITY_STEPS) {
            // Force a predictable avatar payload size:
            // 1) hard resize to 500x500
            // 2) always encode as lossy JPEG
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- Expo's new contextual API is not yet available in this pinned runtime.
            const manipulated = await ImageManipulator.manipulateAsync(
                sourceUri,
                [
                    {
                        resize: {
                            height: TARGET_DIMENSION,
                            width: TARGET_DIMENSION,
                        },
                    },
                ],
                {
                    base64: true,
                    compress: quality,
                    format: ImageManipulator.SaveFormat.JPEG,
                },
            );
            if (!manipulated.base64) {
                continue;
            }
            const bytes = readImageBytesFromBase64(manipulated.base64);
            lastAttemptBytes = bytes.byteLength;
            if (bytes.byteLength <= maxBytes) {
                return { data: bytes, lastAttemptBytes };
            }
        }
        return { data: null, lastAttemptBytes };
    }

    async function handlePickAvatar(): Promise<void> {
        if (!user?.userID || avatarUploading) {
            return;
        }
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
            setAvatarError("Photo library permission is required.");
            return;
        }

        const pickerResult = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            base64: true,
            quality: 0.92,
        });
        if (pickerResult.canceled) {
            return;
        }
        const asset = pickerResult.assets[0];
        if (!asset?.uri) {
            setAvatarError("No image selected.");
            return;
        }
        if (asset.type != null && asset.type !== "image") {
            setAvatarError("Please select an image.");
            return;
        }

        setAvatarError("");
        setAvatarNotice("");
        setAvatarLastAttemptBytes(null);
        setAvatarUploading(true);
        try {
            const originalBytes =
                typeof asset.fileSize === "number" && asset.fileSize > 0
                    ? asset.fileSize
                    : asset.base64 != null
                      ? readImageBytesFromBase64(asset.base64).byteLength
                      : 0;
            setAvatarLastAttemptBytes(originalBytes);
            const compressed = await compressAvatarToLimit(
                asset.uri,
                MAX_AVATAR_BYTES,
            );
            setAvatarLastAttemptBytes(
                compressed.lastAttemptBytes ?? originalBytes,
            );
            const data = compressed.data;
            if (data == null) {
                setAvatarError(
                    "Could not process this image. Please try a different photo.",
                );
                return;
            }
            if (data.byteLength > MAX_AVATAR_BYTES) {
                setAvatarError(
                    `Still too large after compression. Current: ${formatBytes(
                        compressed.lastAttemptBytes ?? data.byteLength,
                    )}. Limit: ${formatBytes(MAX_AVATAR_BYTES)}.`,
                );
                return;
            }
            if (data.byteLength < originalBytes) {
                setAvatarNotice(
                    `Optimized image from ${formatBytes(
                        originalBytes,
                    )} to ${formatBytes(data.byteLength)} (500x500 JPEG).`,
                );
            } else {
                setAvatarNotice(
                    `Processed as 500x500 JPEG (${formatBytes(data.byteLength)}).`,
                );
            }
            const result = await vexService.setAvatar(data);
            if (!result.ok) {
                setAvatarError(result.error ?? "Avatar upload failed.");
                return;
            }
            if (avatarNotice === "") {
                setAvatarNotice(
                    `Avatar updated (${formatBytes(data.byteLength)}).`,
                );
            }
        } catch (err: unknown) {
            setAvatarError(
                err instanceof Error ? err.message : "Avatar upload failed.",
            );
        } finally {
            setAvatarUploading(false);
        }
    }

    return (
        <View style={styles.container}>
            <ChatHeader
                onBack={() => {
                    navigation.goBack();
                }}
                title={title}
            />
            <ScrollView contentContainerStyle={styles.content}>
                {section === "about" ? (
                    <>
                        <View style={styles.rowCard}>
                            <Text style={styles.label}>Version</Text>
                            <Text style={styles.value}>0.1.0</Text>
                        </View>
                        <View style={styles.rowCard}>
                            <Text style={styles.label}>Server</Text>
                            <Text style={styles.value}>{getServerUrl()}</Text>
                        </View>
                    </>
                ) : null}

                {section === "account" ? (
                    <>
                        <View style={styles.rowCard}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.label}>Avatar</Text>
                                <Text style={styles.desc}>
                                    Change your profile image
                                </Text>
                            </View>
                            {avatarUrl != null && !avatarLoadFailed ? (
                                <Image
                                    onError={() => {
                                        setAvatarLoadFailed(true);
                                    }}
                                    source={{ uri: avatarUrl }}
                                    style={styles.avatar}
                                />
                            ) : (
                                <View
                                    style={[
                                        styles.avatarFallback,
                                        {
                                            backgroundColor: `hsl(${avatarHue(user?.userID ?? "0")}, 45%, 40%)`,
                                        },
                                    ]}
                                >
                                    <Text style={styles.avatarFallbackText}>
                                        {initials(
                                            user?.userID ?? "??",
                                            user?.username,
                                        )}
                                    </Text>
                                </View>
                            )}
                            <TouchableOpacity
                                disabled={avatarUploading}
                                onPress={() => {
                                    void handlePickAvatar();
                                }}
                                style={styles.testBtn}
                            >
                                <Text style={styles.testBtnText}>
                                    {avatarUploading
                                        ? "Uploading..."
                                        : "Change"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        {avatarError !== "" ? (
                            <View style={styles.avatarStatusCardError}>
                                <Text style={styles.avatarStatusTitle}>
                                    Avatar upload issue
                                </Text>
                                <Text style={styles.errorText}>
                                    {avatarError}
                                </Text>
                                {avatarLastAttemptBytes != null ? (
                                    <Text style={styles.avatarStatusMeta}>
                                        Current:{" "}
                                        {formatBytes(avatarLastAttemptBytes)} •
                                        Limit: {formatBytes(MAX_AVATAR_BYTES)}
                                    </Text>
                                ) : null}
                            </View>
                        ) : null}
                        {avatarError === "" && avatarNotice !== "" ? (
                            <View style={styles.avatarStatusCardOk}>
                                <Text style={styles.avatarStatusTitleOk}>
                                    Avatar updated
                                </Text>
                                <Text style={styles.avatarStatusMetaOk}>
                                    {avatarNotice}
                                </Text>
                            </View>
                        ) : null}
                        <View style={styles.rowCard}>
                            <Text style={styles.label}>Username</Text>
                            <Text style={styles.value}>
                                {user?.username ?? "—"}
                            </Text>
                        </View>
                        <View style={styles.rowCard}>
                            <Text style={styles.label}>User ID</Text>
                            <Text style={[styles.value, styles.mono]}>
                                {user?.userID.slice(0, 16) ?? "—"}…
                            </Text>
                        </View>
                        <View style={styles.rowCard}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.label}>
                                    Identity key backup
                                </Text>
                                <Text style={styles.desc}>
                                    Export this account's identity key for
                                    recovery
                                </Text>
                            </View>
                            <TouchableOpacity
                                disabled={exportingIdentity}
                                onPress={handleExportIdentityKey}
                                style={styles.testBtn}
                            >
                                <Text style={styles.testBtnText}>
                                    {exportingIdentity
                                        ? "Exporting..."
                                        : "Export"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.rowCard}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.label}>Session</Text>
                                <Text style={styles.desc}>
                                    Current auth and token details
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => {
                                    navigation.navigate("SessionDetails");
                                }}
                                style={styles.testBtn}
                            >
                                <Text style={styles.testBtnText}>Open</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.rowCard}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.label}>Sign out</Text>
                                <Text style={styles.desc}>
                                    Disconnect and return to the login screen
                                </Text>
                            </View>
                            <TouchableOpacity
                                disabled={loggingOut}
                                onPress={handleLogout}
                                style={styles.testBtn}
                            >
                                <Text style={styles.testBtnText}>
                                    {loggingOut ? "Signing out..." : "Sign out"}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                ) : null}

                {section === "notifications" ? (
                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>Test notification</Text>
                            <Text style={styles.desc}>
                                Send a local test notification
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleSendTestNotification}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>Test</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {section === "developer" ? (
                    <>
                        <View style={styles.rowCard}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.label}>
                                    WebSocket debug logs
                                </Text>
                                <Text style={styles.desc}>
                                    Print inbound/outbound frames to terminal
                                </Text>
                            </View>
                            <Switch
                                onValueChange={(value) => {
                                    setWsDebugEnabled(value);
                                    vexService.setWebsocketDebug(value);
                                }}
                                value={wsDebugEnabled}
                            />
                        </View>
                        <View style={styles.rowCard}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.label}>
                                    WebSocket frame payload logs
                                </Text>
                                <Text style={styles.desc}>
                                    Log raw inbound/outbound frame payloads
                                </Text>
                            </View>
                            <Switch
                                onValueChange={(value) => {
                                    setWsFrameDebugEnabled(value);
                                    vexService.setWebsocketFrameDebug(value);
                                }}
                                value={wsFrameDebugEnabled}
                            />
                        </View>
                        <View style={styles.rowCard}>
                            <View style={styles.rowInfo}>
                                <Text style={styles.label}>
                                    WebSocket state transition logs
                                </Text>
                                <Text style={styles.desc}>
                                    Log connect/disconnect/recover lifecycle
                                    events
                                </Text>
                            </View>
                            <Switch
                                onValueChange={(value) => {
                                    setWsStateDebugEnabled(value);
                                    vexService.setWebsocketStateDebug(value);
                                }}
                                value={wsStateDebugEnabled}
                            />
                        </View>
                    </>
                ) : null}

                {section === "data" ? (
                    <View style={styles.rowCard}>
                        <View style={styles.rowInfo}>
                            <Text style={styles.label}>
                                Reset unread counters
                            </Text>
                            <Text style={styles.desc}>
                                Clear all DM and channel unread badges on this
                                device
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleResetUnreadCounts}
                            style={styles.testBtn}
                        >
                            <Text style={styles.testBtnText}>Reset</Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    avatar: {
        borderRadius: 18,
        height: 36,
        width: 36,
    },
    avatarFallback: {
        alignItems: "center",
        borderRadius: 18,
        height: 36,
        justifyContent: "center",
        width: 36,
    },
    avatarFallbackText: {
        ...typography.button,
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "700",
        letterSpacing: 0.2,
    },
    avatarStatusCardError: {
        backgroundColor: "rgba(229, 57, 53, 0.12)",
        borderColor: "rgba(229, 57, 53, 0.48)",
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    avatarStatusCardOk: {
        backgroundColor: "rgba(74, 222, 128, 0.12)",
        borderColor: "rgba(74, 222, 128, 0.4)",
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    avatarStatusMeta: {
        ...typography.body,
        color: "rgba(255,255,255,0.78)",
        fontSize: 12,
    },
    avatarStatusMetaOk: {
        ...typography.body,
        color: "rgba(255,255,255,0.8)",
        fontSize: 12,
    },
    avatarStatusTitle: {
        ...typography.button,
        color: "#FFD0CF",
        fontSize: 13,
        fontWeight: "700",
    },
    avatarStatusTitleOk: {
        ...typography.button,
        color: "#A7F3BD",
        fontSize: 13,
        fontWeight: "700",
    },
    container: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    content: {
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    desc: {
        ...typography.body,
        color: "rgba(255,255,255,0.52)",
        fontSize: 12,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
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
