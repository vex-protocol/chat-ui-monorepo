import React, { useCallback, useRef, useState } from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { getServerOptions } from "../lib/config";
import { mobileConfig } from "../lib/platform";
import { keychainKeyStore } from "../lib/keychain";
import type { AuthScreenProps } from "../navigation/types";
import { vexService } from "../store";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"Finalize">;

const AVATAR_PRESETS = ["🟥", "🔷", "🟢", "🟡", "🟣"] as const;

export function FinalizeScreen({ navigation: _navigation, route }: Props) {
    const method = route.params?.method ?? "username";
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [selectedAvatar, setSelectedAvatar] = useState(0);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [available, setAvailable] = useState<boolean | null>(null);
    const debounceRef = useRef<null | ReturnType<typeof setTimeout>>(null);

    const checkAvailability = useCallback((name: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!name || name.length < 3) {
            setAvailable(null);
            return;
        }
        debounceRef.current = setTimeout(async () => {
            try {
                // TODO: Client.checkUsername() was removed from the public API.
                // For now, skip client-side availability checks; the server will
                // reject duplicate usernames during registration.
                setAvailable(null);
            } catch {
                setAvailable(null);
            }
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
            const result = await vexService.register(
                username,
                password,
                mobileConfig(),
                getServerOptions(),
                keychainKeyStore,
            );

            if (!result.ok) {
                setError(result.error || "Registration failed");
                setLoading(false);
                return;
            }
            // Success — RootNavigator auto-navigates when $user is set
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unexpected error");
            setLoading(false);
        }
    }

    return (
        <ScreenLayout>
            <BackButton />

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
                            autoCorrect={false}
                            editable={!loading}
                            maxLength={19}
                            onChangeText={handleUsernameChange}
                            placeholder="username"
                            placeholderTextColor={colors.mutedDark}
                            style={styles.input}
                            value={username}
                        />
                        {available !== null && (
                            <Text
                                style={[
                                    styles.avail,
                                    available ? styles.availOk : styles.availNo,
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
                        editable={!loading}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor={colors.mutedDark}
                        secureTextEntry
                        style={[styles.input, styles.inputFull]}
                        value={password}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>CONFIRM PASSWORD</Text>
                    <TextInput
                        editable={!loading}
                        onChangeText={setConfirm}
                        placeholder="••••••••"
                        placeholderTextColor={colors.mutedDark}
                        secureTextEntry
                        style={[styles.input, styles.inputFull]}
                        value={confirm}
                    />
                </View>

                {/* Avatar grid */}
                <View style={styles.field}>
                    <Text style={styles.label}>AVATAR</Text>
                    <View style={styles.avatarGrid}>
                        {AVATAR_PRESETS.map((emoji, i) => (
                            <TouchableOpacity
                                key={i}
                                onPress={() => { setSelectedAvatar(i); }}
                            >
                                <CornerBracketBox
                                    color={
                                        selectedAvatar === i
                                            ? colors.accent
                                            : colors.border
                                    }
                                    size={6}
                                >
                                    <View
                                        style={[
                                            styles.avatarCell,
                                            selectedAvatar === i &&
                                                styles.avatarSelected,
                                        ]}
                                    >
                                        <Text style={styles.avatarEmoji}>
                                            {emoji}
                                        </Text>
                                    </View>
                                </CornerBracketBox>
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity onPress={() => {}}>
                            <CornerBracketBox color={colors.border} size={6}>
                                <View style={styles.avatarCell}>
                                    <Text style={styles.avatarPlus}>+</Text>
                                </View>
                            </CornerBracketBox>
                        </TouchableOpacity>
                    </View>
                </View>

                <VexButton
                    disabled={!username || !password || !confirm}
                    glow
                    loading={loading}
                    onPress={handleComplete}
                    style={styles.completeBtn}
                    title="Complete Setup"
                />
            </ScrollView>
        </ScreenLayout>
    );
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
    avatarCell: {
        alignItems: "center",
        backgroundColor: colors.surface,
        height: 56,
        justifyContent: "center",
        width: 56,
    },
    avatarEmoji: {
        fontSize: 28,
    },
    avatarGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 10,
    },
    avatarPlus: {
        color: colors.muted,
        fontSize: 24,
    },
    avatarSelected: {
        borderColor: colors.accent,
        borderWidth: 1,
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
