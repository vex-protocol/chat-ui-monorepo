import type { AuthScreenProps } from "../navigation/types";

import React, { useCallback, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { vexService } from "@vex-chat/store";

import { BackButton } from "../components/BackButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { getServerOptions } from "../lib/config";
import { keychainKeyStore } from "../lib/keychain";
import { mobileConfig } from "../lib/platform";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"Finalize">;
const SIGNUP_TIMEOUT_MS = 20000;
const AVATAR_COLORS = [
    "#E53935",
    "#3949AB",
    "#00897B",
    "#7B1FA2",
    "#FB8C00",
] as const;

export function FinalizeScreen({ navigation: _navigation, route }: Props) {
    const method = route.params.method;
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [selectedColor, setSelectedColor] = useState(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const debounceRef = useRef<null | ReturnType<typeof setTimeout>>(null);
    const passwordInputRef = useRef<TextInput>(null);
    const confirmInputRef = useRef<TextInput>(null);

    const checkAvailability = useCallback((name: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (name.length < 3) {
            setAvailable(null);
            return;
        }
        debounceRef.current = setTimeout(() => {
            // TODO: Client.checkUsername() was removed from the public API.
            // For now, skip client-side availability checks; the server will
            // reject duplicate usernames during registration.
            setAvailable(null);
        }, 400);
    }, []);

    const handleUsernameChange = (text: string) => {
        const cleaned = text.replace(/[^a-zA-Z0-9_]/g, "").slice(0, 19);
        setUsername(cleaned);
        checkAvailability(cleaned);
    };

    async function handleComplete() {
        if (password !== confirm) {
            setError("Passwords do not match");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const result = await withTimeout(
                vexService.register(
                    username,
                    password,
                    mobileConfig(),
                    getServerOptions(),
                    keychainKeyStore,
                ),
                SIGNUP_TIMEOUT_MS,
                "Signup timed out. Check your connection and try again.",
            );

            if (!result.ok) {
                setError(result.error || "Registration failed");
                setLoading(false);
                return;
            }

            // Never block signup on avatar upload.
            const color = AVATAR_COLORS[selectedColor] ?? AVATAR_COLORS[0];
            void vexService.setAvatar(buildSolidAvatarSvgBytes(color));
            // Success — RootNavigator auto-navigates when $user is set
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unexpected error");
            setLoading(false);
        }
    }

    return (
        <ScreenLayout>
            <BackButton />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.keyboardWrap}
            >
                <ScrollView
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    style={styles.scroll}
                >
                    <View style={styles.methodBadge}>
                        <Text style={styles.methodText}>
                            AUTHENTICATED VIA: {method.toUpperCase()}
                        </Text>
                    </View>

                    <Text style={styles.heading}>Finalize.</Text>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    {/* Username input */}
                    <View style={styles.field}>
                        <Text style={styles.label}>HANDLE</Text>
                        <View style={styles.inputRow}>
                            <Text style={styles.atSign}>@</Text>
                            <TextInput
                                autoCapitalize="none"
                                autoComplete="username"
                                autoCorrect={false}
                                editable={!loading}
                                importantForAutofill="yes"
                                maxLength={19}
                                onChangeText={handleUsernameChange}
                                onSubmitEditing={() => {
                                    passwordInputRef.current?.focus();
                                }}
                                placeholder="username"
                                placeholderTextColor={colors.mutedDark}
                                returnKeyType="next"
                                style={styles.input}
                                textContentType="username"
                                value={username}
                            />
                            {available !== null && (
                                <Text
                                    style={[
                                        styles.avail,
                                        available
                                            ? styles.availOk
                                            : styles.availNo,
                                    ]}
                                >
                                    {available ? "✓" : "✗"}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Password */}
                    <View style={styles.field}>
                        <Text style={styles.label}>PASSWORD</Text>
                        <TextInput
                            autoComplete="new-password"
                            editable={!loading}
                            importantForAutofill="yes"
                            onChangeText={setPassword}
                            onSubmitEditing={() => {
                                confirmInputRef.current?.focus();
                            }}
                            placeholder="••••••••"
                            placeholderTextColor={colors.mutedDark}
                            ref={passwordInputRef}
                            returnKeyType="next"
                            secureTextEntry
                            style={[styles.input, styles.inputFull]}
                            textContentType="newPassword"
                            value={password}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>CONFIRM PASSWORD</Text>
                        <TextInput
                            autoComplete="new-password"
                            editable={!loading}
                            importantForAutofill="yes"
                            onChangeText={setConfirm}
                            onSubmitEditing={() => {
                                if (
                                    !loading &&
                                    username &&
                                    password &&
                                    confirm
                                ) {
                                    void handleComplete();
                                }
                            }}
                            placeholder="••••••••"
                            placeholderTextColor={colors.mutedDark}
                            ref={confirmInputRef}
                            returnKeyType="done"
                            secureTextEntry
                            style={[styles.input, styles.inputFull]}
                            textContentType="newPassword"
                            value={confirm}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>AVATAR COLOR</Text>
                        <View style={styles.colorRow}>
                            {AVATAR_COLORS.map((color, i) => (
                                <TouchableOpacity
                                    key={color}
                                    onPress={() => {
                                        setSelectedColor(i);
                                    }}
                                    style={[
                                        styles.colorSwatch,
                                        { backgroundColor: color },
                                        selectedColor === i &&
                                            styles.colorSelected,
                                    ]}
                                />
                            ))}
                        </View>
                        <Text style={styles.avatarHint}>
                            We auto-generate a simple avatar from this color.
                        </Text>
                    </View>

                    <VexButton
                        disabled={!username || !password || !confirm}
                        glow
                        loading={loading}
                        onPress={() => {
                            void handleComplete();
                        }}
                        style={styles.completeBtn}
                        title="Complete Setup"
                    />
                </ScrollView>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
}

function buildSolidAvatarSvgBytes(colorHex: string): Uint8Array {
    const safe = /^#[0-9a-fA-F]{6}$/.test(colorHex) ? colorHex : "#E53935";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256"><rect width="256" height="256" fill="${safe}"/></svg>`;
    return new TextEncoder().encode(svg);
}

async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string,
): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
        return await Promise.race([
            promise,
            new Promise<T>((_resolve, reject) => {
                timer = setTimeout(() => {
                    reject(new Error(timeoutMessage));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timer) {
            clearTimeout(timer);
        }
    }
}

const styles = StyleSheet.create({
    atSign: {
        ...typography.bodyLarge,
        color: colors.muted,
        marginRight: 4,
    },
    avail: {
        fontSize: 16,
        marginLeft: 8,
    },
    availNo: {
        color: colors.error,
    },
    availOk: {
        color: "#22c55e",
    },
    avatarHint: {
        ...typography.body,
        color: colors.mutedDark,
        fontSize: 12,
    },
    colorRow: {
        flexDirection: "row",
        gap: 12,
    },
    colorSelected: {
        borderColor: colors.borderSubtle,
        borderWidth: 3,
    },
    colorSwatch: {
        borderColor: "rgba(255,255,255,0.25)",
        borderRadius: 16,
        borderWidth: 1,
        height: 32,
        width: 32,
    },
    completeBtn: {
        marginBottom: 32,
        marginTop: 8,
    },
    errorBox: {
        backgroundColor: "rgba(229, 57, 53, 0.15)",
        borderColor: colors.error,
        borderWidth: 1,
        marginBottom: 12,
        padding: 10,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
    },
    field: {
        gap: 6,
        marginBottom: 16,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
        marginBottom: 20,
        marginTop: 12,
    },
    input: {
        color: colors.textSecondary,
        flex: 1,
        fontSize: 14,
        paddingVertical: 12,
    },
    inputFull: {
        backgroundColor: colors.input,
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        paddingHorizontal: 12,
    },
    inputRow: {
        alignItems: "center",
        backgroundColor: colors.input,
        borderColor: colors.borderSubtle,
        borderWidth: 1,
        flexDirection: "row",
        paddingHorizontal: 12,
    },
    keyboardWrap: {
        flex: 1,
    },
    label: {
        ...typography.label,
        color: colors.muted,
    },
    methodBadge: {
        alignSelf: "flex-start",
        borderColor: colors.border,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    methodText: {
        ...typography.label,
        color: colors.muted,
        fontSize: 10,
    },
    scroll: {
        flex: 1,
        marginTop: 24,
    },
});
