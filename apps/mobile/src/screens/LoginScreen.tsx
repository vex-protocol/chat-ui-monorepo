import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { expoPreset } from "@vex-chat/libvex/preset/expo";

import { getServerOptions } from "../lib/config";
import { keychainKeyStore } from "../lib/keychain";
import { loginAndBootstrap } from "../store";

export function LoginScreen({ navigation }: { navigation: any }) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setLoading(true);
        setError("");

        try {
            const result = await loginAndBootstrap(
                username,
                password,
                expoPreset(),
                getServerOptions(),
                keychainKeyStore,
            );

            if (!result.ok) {
                setError(result.error || "Invalid username or password");
                setLoading(false);
                return;
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unexpected error");
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.page}
        >
            <View style={styles.card}>
                <Text style={styles.title}>Welcome back</Text>
                <Text style={styles.subtitle}>Sign in to Vex Chat</Text>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                <View style={styles.field}>
                    <Text style={styles.label}>USERNAME</Text>
                    <TextInput
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                        onChange={(e) => { setUsername(e.nativeEvent.text); }}
                        onChangeText={setUsername}
                        placeholder="your username"
                        placeholderTextColor="#666666"
                        style={styles.input}
                        value={username}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>PASSWORD</Text>
                    <TextInput
                        editable={!loading}
                        onChange={(e) => { setPassword(e.nativeEvent.text); }}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor="#666666"
                        secureTextEntry
                        style={styles.input}
                        value={password}
                    />
                </View>

                <TouchableOpacity
                    disabled={loading || !username || !password}
                    onPress={handleLogin}
                    style={[styles.button, loading && styles.buttonDisabled]}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.buttonText}>Sign in</Text>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>
                        Don't have an account?{" "}
                    </Text>
                    <TouchableOpacity
                        onPress={() => navigation.navigate("Register")}
                    >
                        <Text style={styles.link}>Register</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    button: {
        alignItems: "center",
        backgroundColor: "#cc2a2a",
        borderRadius: 4,
        marginTop: 4,
        paddingVertical: 12,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    card: {
        backgroundColor: "#141414",
        borderColor: "#2a2a2a",
        borderRadius: 8,
        borderWidth: 1,
        gap: 16,
        padding: 32,
        width: 340,
    },
    errorBox: {
        backgroundColor: "rgba(229, 57, 53, 0.15)",
        borderColor: "#e53935",
        borderRadius: 4,
        borderWidth: 1,
        padding: 10,
    },
    errorText: { color: "#e53935", fontSize: 13 },
    field: { gap: 5 },
    footer: {
        alignItems: "center",
        flexDirection: "row",
        justifyContent: "center",
    },
    footerText: { color: "#a0a0a0", fontSize: 13 },
    input: {
        backgroundColor: "#242424",
        borderColor: "#2a2a2a",
        borderRadius: 4,
        borderWidth: 1,
        color: "#e8e8e8",
        fontSize: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    label: {
        color: "#a0a0a0",
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    link: { color: "#cc2a2a", fontSize: 13, textDecorationLine: "underline" },
    page: {
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        flex: 1,
        justifyContent: "center",
    },
    subtitle: { color: "#a0a0a0", fontSize: 13, marginTop: -8 },
    title: { color: "#e8e8e8", fontSize: 22, fontWeight: "700" },
});
