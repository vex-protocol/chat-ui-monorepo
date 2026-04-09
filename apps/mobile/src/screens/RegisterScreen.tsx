import React, { useState } from "react";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { getServerOptions } from "../lib/config";
import { mobileConfig } from "../lib/platform";
import { keychainKeyStore } from "../lib/keychain";
import type { AuthScreenProps } from "../navigation/types";
import { vexService } from "../store";

export function RegisterScreen({ navigation }: AuthScreenProps<"Register">) {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleRegister() {
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
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unexpected error");
            setLoading(false);
        }
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.page}
        >
            <ScrollView
                contentContainerStyle={styles.scroll}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.card}>
                    <Text style={styles.title}>Create account</Text>
                    <Text style={styles.subtitle}>Join Vex Chat</Text>

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
                            maxLength={19}
                            onChange={(e) => { setUsername(e.nativeEvent.text); }}
                            onChangeText={setUsername}
                            placeholder="choose a username"
                            placeholderTextColor="#666666"
                            style={styles.input}
                            textContentType="none"
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
                            textContentType="none"
                            value={password}
                        />
                    </View>

                    <View style={styles.field}>
                        <Text style={styles.label}>CONFIRM PASSWORD</Text>
                        <TextInput
                            editable={!loading}
                            onChange={(e) => { setConfirm(e.nativeEvent.text); }}
                            onChangeText={setConfirm}
                            placeholder="••••••••"
                            placeholderTextColor="#666666"
                            secureTextEntry
                            style={styles.input}
                            textContentType="none"
                            value={confirm}
                        />
                    </View>

                    <TouchableOpacity
                        disabled={loading || !username || !password || !confirm}
                        onPress={handleRegister}
                        style={[
                            styles.button,
                            loading && styles.buttonDisabled,
                        ]}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" size="small" />
                        ) : (
                            <Text style={styles.buttonText}>
                                Create account
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            Already have an account?{" "}
                        </Text>
                        <TouchableOpacity
                            onPress={() => navigation.navigate("Login")}
                        >
                            <Text style={styles.link}>Sign in</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
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
    page: { backgroundColor: "#1a1a1a", flex: 1 },
    scroll: {
        alignItems: "center",
        flexGrow: 1,
        justifyContent: "center",
        padding: 16,
    },
    subtitle: { color: "#a0a0a0", fontSize: 13, marginTop: -8 },
    title: { color: "#e8e8e8", fontSize: 22, fontWeight: "700" },
});
