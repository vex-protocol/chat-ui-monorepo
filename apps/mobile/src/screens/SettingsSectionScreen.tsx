import type { AppScreenProps } from "../navigation/types";

import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    Vibration,
    View,
} from "react-native";

import { $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";

import { Avatar } from "../components/Avatar";
import { ChatHeader } from "../components/ChatHeader";
import { MenuRow, MenuSection } from "../components/MenuRow";
import { $avatarCropResult } from "../lib/avatarCropResult";
import { getServerUrl } from "../lib/config";
import { $devOptionsUnlocked, setDevOptionsUnlocked } from "../lib/devMode";
import { colors, typography } from "../theme";

const DEV_UNLOCK_TAPS = 7;
const DEV_UNLOCK_WINDOW_MS = 3000;
const DEV_UNLOCK_HINT_AT = 4;

export function SettingsSectionScreen({
    navigation,
    route,
}: AppScreenProps<"SettingsSection">) {
    const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
    const user = useStore($user);
    const section = route.params.section;
    const [avatarError, setAvatarError] = useState("");
    const [avatarLastAttemptBytes, setAvatarLastAttemptBytes] = useState<
        null | number
    >(null);
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
    // Cropper hand-off: when the cropper screen finishes, it writes a
    // result here. We stash the request id we kicked off with so we
    // only consume *our* result (not stale state from a previous
    // cropper invocation that the user cancelled).
    const cropResult = useStore($avatarCropResult);
    const expectedCropRequestRef = useRef<null | number>(null);
    // Easter-egg counter for unlocking the developer surface from
    // About → Version. State sticks while the user is on this screen;
    // navigating away resets it (component unmount drops the closure).
    const devUnlocked = useStore($devOptionsUnlocked);
    const [versionTaps, setVersionTaps] = useState(0);
    const versionTapResetRef = useRef<null | ReturnType<typeof setTimeout>>(
        null,
    );
    useEffect(() => {
        return () => {
            if (versionTapResetRef.current) {
                clearTimeout(versionTapResetRef.current);
            }
        };
    }, []);

    function handleVersionTap(): void {
        if (devUnlocked) {
            return;
        }
        if (versionTapResetRef.current) {
            clearTimeout(versionTapResetRef.current);
        }
        const next = versionTaps + 1;
        if (next >= DEV_UNLOCK_TAPS) {
            setVersionTaps(0);
            Vibration.vibrate([0, 25, 60, 25, 60, 25]);
            void setDevOptionsUnlocked(true);
            Alert.alert(
                "Developer options unlocked",
                "Connection diagnostics are now available under Settings → Developer.",
            );
            return;
        }
        setVersionTaps(next);
        Vibration.vibrate(8);
        if (next === DEV_UNLOCK_HINT_AT) {
            // Subtle nudge once the user is most of the way there.
            Alert.alert(
                "Almost there",
                `${DEV_UNLOCK_TAPS - next} more tap${
                    DEV_UNLOCK_TAPS - next === 1 ? "" : "s"
                } to unlock developer options.`,
            );
        }
        versionTapResetRef.current = setTimeout(() => {
            setVersionTaps(0);
        }, DEV_UNLOCK_WINDOW_MS);
    }

    function handleLockDeveloperOptions(): void {
        Alert.alert(
            "Lock developer options?",
            "The diagnostics menu will be hidden again until you re-enter the easter egg in About.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void setDevOptionsUnlocked(false);
                        // Bounce back to Settings; the developer
                        // section will be hidden once we land there.
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        }
                    },
                    style: "destructive",
                    text: "Lock",
                },
            ],
        );
    }

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

    /**
     * Whether the picked asset is square (within 1px tolerance). The OS
     * cropper occasionally hands back a slightly-off-by-one rectangle
     * even when we ask for `aspect: [1, 1]`.
     */
    function isSquare(width: null | number, height: null | number): boolean {
        if (width == null || height == null) return false;
        return Math.abs(width - height) <= 1;
    }

    const uploadSquareUri = useCallback(
        async (sourceUri: string, originalBytes: number): Promise<void> => {
            setAvatarLastAttemptBytes(originalBytes);
            const compressed = await compressAvatarToLimit(
                sourceUri,
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
            const sizeNote =
                originalBytes > 0 && data.byteLength < originalBytes
                    ? `Optimized from ${formatBytes(originalBytes)} to ${formatBytes(data.byteLength)} (500x500 JPEG).`
                    : `Processed as 500x500 JPEG (${formatBytes(data.byteLength)}).`;
            const result = await vexService.setAvatar(data);
            if (!result.ok) {
                setAvatarError(result.error ?? "Avatar upload failed.");
                return;
            }
            setAvatarNotice(sizeNote);
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps -- helpers and constants are stable
        [],
    );

    // Picks up a cropped image emitted by `AvatarCropScreen` and
    // continues the upload pipeline for it.
    useEffect(() => {
        if (!cropResult) return;
        const expected = expectedCropRequestRef.current;
        if (expected == null || cropResult.requestId !== expected) {
            return;
        }
        // Consume the result (single-shot).
        $avatarCropResult.set(null);
        expectedCropRequestRef.current = null;
        const cropUri = cropResult.uri;
        setAvatarError("");
        setAvatarNotice("");
        setAvatarLastAttemptBytes(null);
        setAvatarUploading(true);
        void (async () => {
            try {
                await uploadSquareUri(cropUri, 0);
            } catch (err: unknown) {
                setAvatarError(
                    err instanceof Error
                        ? err.message
                        : "Avatar upload failed.",
                );
            } finally {
                setAvatarUploading(false);
            }
        })();
    }, [cropResult, uploadSquareUri]);

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
            // Tell the OS cropper we want a 1:1 result. iOS honors this
            // strictly; Android's cropper uses it as the initial aspect
            // but lets the user resize freely, so we still validate
            // afterwards and route through our in-app cropper if the
            // result isn't square.
            aspect: [1, 1],
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

        const width = typeof asset.width === "number" ? asset.width : null;
        const height = typeof asset.height === "number" ? asset.height : null;

        // Non-square asset (the OS cropper was skipped or freeform-cropped).
        // Send the user through our in-app cropper to pick a square region.
        if (!isSquare(width, height) && width != null && height != null) {
            const requestId = Math.floor(Math.random() * 1_000_000_000);
            expectedCropRequestRef.current = requestId;
            // Pre-clear any stale cropper result (different request id, but
            // safer to start clean).
            $avatarCropResult.set(null);
            navigation.navigate("AvatarCrop", {
                sourceHeight: height,
                sourceUri: asset.uri,
                sourceWidth: width,
            });
            // The useEffect above will pick the result up and finish the
            // upload when the cropper screen returns.
            // We can't compare `requestId` directly to the cropper's id
            // since the cropper makes its own; we just gate on "is this
            // the most recent crop request we issued?".
            expectedCropRequestRef.current = null;
            return;
        }

        // Already square — upload directly.
        setAvatarUploading(true);
        try {
            const originalBytes =
                typeof asset.fileSize === "number" && asset.fileSize > 0
                    ? asset.fileSize
                    : asset.base64 != null
                      ? readImageBytesFromBase64(asset.base64).byteLength
                      : 0;
            await uploadSquareUri(asset.uri, originalBytes);
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
                            onPress={handleVersionTap}
                            value="0.1.0"
                            {...(devUnlocked
                                ? {
                                      description:
                                          "Developer options are unlocked",
                                  }
                                : versionTaps > 0
                                  ? {
                                        description: `${DEV_UNLOCK_TAPS - versionTaps} more tap${
                                            DEV_UNLOCK_TAPS - versionTaps === 1
                                                ? ""
                                                : "s"
                                        } to unlock developer options`,
                                    }
                                  : {})}
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
                                    user?.userID ? (
                                        <Avatar
                                            displayName={user.username}
                                            size={40}
                                            userID={user.userID}
                                        />
                                    ) : null
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

                {section === "developer" && devUnlocked ? (
                    <>
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
                        <MenuSection
                            footer="Hides this menu again until you re-enter the easter egg in About."
                            title="Visibility"
                        >
                            <MenuRow
                                description="Hide developer options"
                                icon="lock-closed-outline"
                                label="Lock developer options"
                                onPress={handleLockDeveloperOptions}
                                tone="danger"
                            />
                        </MenuSection>
                    </>
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
