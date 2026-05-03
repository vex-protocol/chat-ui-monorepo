import type { AppScreenProps } from "../navigation/types";

import React, { useEffect, useMemo, useState } from "react";
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

import { $user, vexService } from "@vex-chat/store";
import { $avatarHash, avatarHue } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { ChatHeader } from "../components/ChatHeader";
import { MenuRow, MenuSection } from "../components/MenuRow";
import { getServerOptions, getServerUrl } from "../lib/config";
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
            default:
                return "Settings";
        }
    }, [section]);

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
                    <MenuSection title="App">
                        <MenuRow
                            icon="pricetag-outline"
                            label="Version"
                            value="0.1.0"
                        />
                        <MenuRow
                            icon="server-outline"
                            label="Server"
                            value={getServerUrl()}
                        />
                    </MenuSection>
                ) : null}

                {section === "account" ? (
                    <>
                        <MenuSection title="Profile">
                            <MenuRow
                                accessory={
                                    avatarUrl != null && !avatarLoadFailed ? (
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
                                            <Text
                                                style={
                                                    styles.avatarFallbackText
                                                }
                                            >
                                                {initials(
                                                    user?.userID ?? "??",
                                                    user?.username,
                                                )}
                                            </Text>
                                        </View>
                                    )
                                }
                                description={
                                    avatarUploading
                                        ? "Uploading..."
                                        : "Tap to change profile image"
                                }
                                disabled={avatarUploading}
                                icon="image-outline"
                                label="Avatar"
                                onPress={() => {
                                    void handlePickAvatar();
                                }}
                                showChevron
                            />
                            {avatarError !== "" ? (
                                <View style={styles.statusCardError}>
                                    <Text style={styles.statusTitle}>
                                        Avatar upload issue
                                    </Text>
                                    <Text style={styles.errorText}>
                                        {avatarError}
                                    </Text>
                                    {avatarLastAttemptBytes != null ? (
                                        <Text style={styles.statusMeta}>
                                            Current:{" "}
                                            {formatBytes(
                                                avatarLastAttemptBytes,
                                            )}{" "}
                                            • Limit:{" "}
                                            {formatBytes(MAX_AVATAR_BYTES)}
                                        </Text>
                                    ) : null}
                                </View>
                            ) : null}
                            {avatarError === "" && avatarNotice !== "" ? (
                                <View style={styles.statusCardOk}>
                                    <Text style={styles.statusTitleOk}>
                                        Avatar updated
                                    </Text>
                                    <Text style={styles.statusMetaOk}>
                                        {avatarNotice}
                                    </Text>
                                </View>
                            ) : null}
                            <MenuRow
                                icon="at-outline"
                                label="Username"
                                value={user?.username ?? "—"}
                            />
                            <MenuRow
                                icon="finger-print-outline"
                                label="User ID"
                                monoBlock={user?.userID ?? "—"}
                            />
                        </MenuSection>

                        <MenuSection title="Account">
                            <MenuRow
                                description="Disconnect and return to login"
                                disabled={loggingOut}
                                icon="log-out-outline"
                                label={
                                    loggingOut ? "Signing out..." : "Sign out"
                                }
                                onPress={handleLogout}
                                tone="danger"
                            />
                        </MenuSection>
                    </>
                ) : null}

                {section === "developer" ? (
                    <MenuSection
                        footer="Logs print to the device terminal/logcat. Useful when reporting issues."
                        title="WebSocket Debug"
                    >
                        <MenuRow
                            accessory={
                                <Switch
                                    onValueChange={(value) => {
                                        setWsDebugEnabled(value);
                                        vexService.setWebsocketDebug(value);
                                    }}
                                    value={wsDebugEnabled}
                                />
                            }
                            description="Print inbound/outbound frames"
                            icon="code-slash-outline"
                            label="Debug logs"
                        />
                        <MenuRow
                            accessory={
                                <Switch
                                    onValueChange={(value) => {
                                        setWsFrameDebugEnabled(value);
                                        vexService.setWebsocketFrameDebug(
                                            value,
                                        );
                                    }}
                                    value={wsFrameDebugEnabled}
                                />
                            }
                            description="Log raw frame payloads"
                            icon="document-text-outline"
                            label="Frame payload logs"
                        />
                        <MenuRow
                            accessory={
                                <Switch
                                    onValueChange={(value) => {
                                        setWsStateDebugEnabled(value);
                                        vexService.setWebsocketStateDebug(
                                            value,
                                        );
                                    }}
                                    value={wsStateDebugEnabled}
                                />
                            }
                            description="Connect/disconnect/recover lifecycle"
                            icon="pulse-outline"
                            label="State transition logs"
                        />
                    </MenuSection>
                ) : null}

                {section === "data" ? (
                    <MenuSection title="Local Data">
                        <MenuRow
                            description="Clear all unread badges"
                            icon="refresh-outline"
                            label="Reset unread counters"
                            onPress={handleResetUnreadCounts}
                            tone="danger"
                        />
                    </MenuSection>
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
    container: {
        backgroundColor: colors.bg,
        flex: 1,
    },
    content: {
        gap: 18,
        paddingBottom: 24,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
        fontSize: 12,
    },
    statusCardError: {
        backgroundColor: "rgba(229, 57, 53, 0.12)",
        borderColor: "rgba(229, 57, 53, 0.48)",
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    statusCardOk: {
        backgroundColor: "rgba(74, 222, 128, 0.12)",
        borderColor: "rgba(74, 222, 128, 0.4)",
        borderRadius: 10,
        borderWidth: 1,
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    statusMeta: {
        ...typography.body,
        color: "rgba(255,255,255,0.78)",
        fontSize: 12,
    },
    statusMetaOk: {
        ...typography.body,
        color: "rgba(255,255,255,0.8)",
        fontSize: 12,
    },
    statusTitle: {
        ...typography.button,
        color: "#FFD0CF",
        fontSize: 13,
        fontWeight: "700",
    },
    statusTitleOk: {
        ...typography.button,
        color: "#A7F3BD",
        fontSize: 13,
        fontWeight: "700",
    },
});
