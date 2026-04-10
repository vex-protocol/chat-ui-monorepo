import React, { useState } from "react";
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { loginAndBootstrap } from "../store";
import { expoPreset } from "@vex-chat/libvex/preset/expo";
import { keychainKeyStore } from "../lib/keychain";
import { getServerOptions } from "../lib/config";

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
            style={styles.page}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
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
                        style={styles.input}
                        value={username}
                        onChangeText={setUsername}
                        onChange={(e) => setUsername(e.nativeEvent.text)}
                        placeholder="your username"
                        placeholderTextColor="#666666"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={!loading}
                    />
                </View>

                <View style={styles.field}>
                    <Text style={styles.label}>PASSWORD</Text>
                    <TextInput
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        onChange={(e) => setPassword(e.nativeEvent.text)}
                        placeholder="••••••••"
                        placeholderTextColor="#666666"
                        secureTextEntry
                        editable={!loading}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
                    onPress={handleLogin}
                    disabled={loading || !username || !password}
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
                        onPress={() => navigation.navigate("Initialize")}
                    >
                        <Text style={styles.link}>Register</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    page: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
    },
    card: {
        backgroundColor: "#141414",
        borderColor: "#2a2a2a",
        borderWidth: 1,
        borderRadius: 8,
        padding: 32,
        width: 340,
        gap: 16,
    },
    title: { color: "#e8e8e8", fontSize: 22, fontWeight: "700" },
    subtitle: { color: "#a0a0a0", fontSize: 13, marginTop: -8 },
    errorBox: {
        backgroundColor: "rgba(229, 57, 53, 0.15)",
        borderColor: "#e53935",
        borderWidth: 1,
        borderRadius: 4,
        padding: 10,
    },
    errorText: { color: "#e53935", fontSize: 13 },
    field: { gap: 5 },
    label: {
        color: "#a0a0a0",
        fontSize: 12,
        fontWeight: "600",
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: "#242424",
        color: "#e8e8e8",
        borderColor: "#2a2a2a",
        borderWidth: 1,
        borderRadius: 4,
        paddingVertical: 10,
        paddingHorizontal: 12,
        fontSize: 14,
    },
    button: {
        backgroundColor: "#cc2a2a",
        borderRadius: 4,
        paddingVertical: 12,
        alignItems: "center",
        marginTop: 4,
    },
    buttonDisabled: { opacity: 0.5 },
    buttonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
    footer: {
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    footerText: { color: "#a0a0a0", fontSize: 13 },
    link: { color: "#cc2a2a", fontSize: 13, textDecorationLine: "underline" },
});
