import type { AuthScreenProps } from "../navigation/types";

import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
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
import { VexLogo } from "../components/VexLogo";
import { getServerOptions } from "../lib/config";
import { keychainKeyStore } from "../lib/keychain";
import { mobileConfig } from "../lib/platform";
import { colors, typography } from "../theme";

export function LoginScreen({ navigation }: AuthScreenProps<"Login">) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setLoading(true);
        setError("");

        try {
            const result = await vexService.login(
                username,
                password,
                mobileConfig(),
                getServerOptions(),
                keychainKeyStore,
            );

            if (!result.ok) {
                setError(result.error || "Invalid username or password");
                setLoading(false);
                return;
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unexpected error");
            setLoading(false);
        }
    }

    return (
        <ScreenLayout style={styles.layout}>
            <BackButton />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : undefined}
                style={styles.container}
            >
                <View pointerEvents="none" style={styles.blackoutLayer} />
                <View pointerEvents="none" style={styles.glowTop} />
                <View pointerEvents="none" style={styles.glowBottom} />

                <View style={styles.content}>
                    <View style={styles.logoWrap}>
                        <VexLogo size={38} />
                    </View>
                    <Text style={styles.label}>SIGN IN</Text>
                    <Text style={styles.heading}>Welcome back.</Text>

                    {error ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{error}</Text>
                        </View>
                    ) : null}

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>USERNAME</Text>
                        <TextInput
                            autoCapitalize="none"
                            autoCorrect={false}
                            editable={!loading}
                            onChangeText={setUsername}
                            placeholder="your username"
                            placeholderTextColor={colors.mutedDark}
                            style={styles.input}
                            value={username}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.fieldLabel}>PASSWORD</Text>
                        <TextInput
                            editable={!loading}
                            onChangeText={setPassword}
                            placeholder="••••••••"
                            placeholderTextColor={colors.mutedDark}
                            secureTextEntry
                            style={styles.input}
                            value={password}
                        />
                    </View>

                    <VexButton
                        disabled={loading || !username || !password}
                        glow
                        loading={loading}
                        onPress={() => void handleLogin()}
                        style={styles.signInButton}
                        title="Sign In"
                        variant="primary"
                    />

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Don't have an account?
                        </Text>
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate("Initialize");
                            }}
                        >
                            <Text style={styles.link}>Create account</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    blackoutLayer: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "#000000",
        opacity: 0.72,
    },
    container: {
        flex: 1,
        justifyContent: "center",
        paddingBottom: 22,
    },
    content: {
        alignSelf: "center",
        gap: 14,
        maxWidth: 460,
        width: "100%",
        zIndex: 1,
    },
    errorBox: {
        backgroundColor: "rgba(229, 57, 53, 0.15)",
        borderColor: colors.error,
        borderWidth: 1,
        padding: 10,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
    },
    field: { gap: 6 },
    fieldLabel: {
        ...typography.label,
        color: "rgba(255,255,255,0.48)",
    },
    footer: {
        alignItems: "center",
        flexDirection: "row",
        gap: 6,
        justifyContent: "center",
        marginTop: 10,
    },
    footerText: {
        ...typography.body,
        color: "rgba(255,255,255,0.62)",
    },
    glowBottom: {
        backgroundColor: colors.accent,
        borderRadius: 120,
        bottom: -40,
        height: 140,
        left: "30%",
        opacity: 0.08,
        position: "absolute",
        width: 140,
    },
    glowTop: {
        backgroundColor: colors.accent,
        borderRadius: 140,
        height: 160,
        opacity: 0.1,
        position: "absolute",
        right: -44,
        top: -48,
        width: 160,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
        marginBottom: 10,
    },
    input: {
        backgroundColor: "rgba(255,255,255,0.03)",
        borderColor: "rgba(255,255,255,0.10)",
        borderWidth: 1,
        color: colors.textSecondary,
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    label: {
        ...typography.label,
        color: "rgba(255,255,255,0.48)",
    },
    layout: {
        backgroundColor: "#000000",
    },
    link: {
        ...typography.body,
        color: colors.accent,
        textDecorationLine: "underline",
    },
    logoWrap: {
        marginBottom: 4,
    },
    signInButton: {
        marginTop: 4,
        width: "100%",
    },
});
