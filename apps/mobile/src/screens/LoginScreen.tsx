import type { AuthScreenProps } from "../navigation/types";

import React, { useRef, useState } from "react";
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
    const [pendingApprovalRequestID, setPendingApprovalRequestID] = useState<
        null | string
    >(null);
    const passwordInputRef = useRef<TextInput>(null);

    async function handleLogin() {
        setLoading(true);
        setError("");
        setPendingApprovalRequestID(null);

        try {
            const result = await vexService.login(
                username,
                password,
                mobileConfig(),
                getServerOptions(),
                keychainKeyStore,
            );

            if (!result.ok) {
                if (result.pendingDeviceApproval) {
                    setPendingApprovalRequestID(result.pendingRequestID ?? "");
                    setError("");
                    setLoading(false);
                    navigation.navigate("Authenticate", {
                        requestID: result.pendingRequestID,
                        username,
                    });
                } else {
                    setPendingApprovalRequestID(null);
                    setError(result.error || "Invalid username or password");
                }
                setLoading(false);
                return;
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : "Unexpected error");
            setPendingApprovalRequestID(null);
            setLoading(false);
        }
    }

    const pendingApproval = pendingApprovalRequestID !== null;
    const formBusy = loading || pendingApproval;

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

                {pendingApproval ? (
                    <View style={styles.pendingScreen}>
                        <View style={styles.pendingLogoWrap}>
                            <VexLogo size={42} />
                        </View>
                        <View style={styles.pendingSpinnerWrap}>
                            <ActivityIndicator
                                color={colors.accent}
                                size="large"
                            />
                        </View>
                        <Text style={styles.pendingScreenLabel}>
                            AUTHENTICATING
                        </Text>
                        <Text style={styles.pendingScreenHeading}>
                            Waiting for approval
                        </Text>
                        <Text style={styles.pendingScreenText}>
                            Approve this sign-in from one of your existing
                            devices. You will be logged in automatically as soon
                            as approval is received.
                        </Text>
                        {pendingApprovalRequestID !== "" ? (
                            <Text style={styles.pendingRequestID}>
                                Request ID: {pendingApprovalRequestID}
                            </Text>
                        ) : null}
                        <TouchableOpacity
                            onPress={() => {
                                setPendingApprovalRequestID(null);
                                setLoading(false);
                                setError("");
                            }}
                            style={styles.pendingCancelBtn}
                        >
                            <Text style={styles.pendingCancelBtnText}>
                                Cancel and edit login
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
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
                                autoComplete="username"
                                autoCorrect={false}
                                editable={!formBusy}
                                importantForAutofill="yes"
                                onChangeText={setUsername}
                                onSubmitEditing={() => {
                                    passwordInputRef.current?.focus();
                                }}
                                placeholder="your username"
                                placeholderTextColor={colors.mutedDark}
                                returnKeyType="next"
                                style={styles.input}
                                textContentType="username"
                                value={username}
                            />
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>PASSWORD</Text>
                            <TextInput
                                autoComplete="password"
                                editable={!formBusy}
                                importantForAutofill="yes"
                                onChangeText={setPassword}
                                onSubmitEditing={() => {
                                    if (!formBusy && username && password) {
                                        void handleLogin();
                                    }
                                }}
                                placeholder="••••••••"
                                placeholderTextColor={colors.mutedDark}
                                ref={passwordInputRef}
                                returnKeyType="done"
                                secureTextEntry
                                style={styles.input}
                                textContentType="password"
                                value={password}
                            />
                        </View>

                        <VexButton
                            disabled={formBusy || !username || !password}
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
                )}
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
    pendingCancelBtn: {
        alignItems: "center",
        borderColor: "rgba(255,255,255,0.24)",
        borderWidth: 1,
        marginTop: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    pendingCancelBtnText: {
        ...typography.button,
        color: "rgba(225,236,255,0.9)",
        fontWeight: "600",
    },
    pendingCard: {
        backgroundColor: "rgba(43, 113, 255, 0.12)",
        borderColor: "rgba(43, 113, 255, 0.38)",
        borderWidth: 1,
        gap: 8,
        padding: 10,
    },
    pendingLogoWrap: {
        marginBottom: 8,
    },
    pendingRequestID: {
        ...typography.body,
        color: "rgba(192,216,255,0.72)",
        fontSize: 12,
        textAlign: "center",
    },
    pendingRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
    },
    pendingScreen: {
        alignItems: "center",
        alignSelf: "center",
        maxWidth: 460,
        paddingHorizontal: 16,
        width: "100%",
        zIndex: 1,
    },
    pendingScreenHeading: {
        ...typography.heading,
        color: colors.text,
        marginTop: 8,
        textAlign: "center",
    },
    pendingScreenLabel: {
        ...typography.label,
        color: "rgba(189,211,255,0.62)",
        marginTop: 10,
    },
    pendingScreenText: {
        ...typography.body,
        color: "rgba(212,228,255,0.9)",
        marginTop: 8,
        textAlign: "center",
    },
    pendingSpinnerWrap: {
        alignItems: "center",
        backgroundColor: "rgba(43,113,255,0.08)",
        borderColor: "rgba(43,113,255,0.3)",
        borderWidth: 1,
        height: 68,
        justifyContent: "center",
        marginTop: 8,
        width: 68,
    },
    pendingText: {
        ...typography.body,
        color: "rgba(212,228,255,0.9)",
    },
    pendingTitle: {
        ...typography.button,
        color: "#CFE2FF",
        fontWeight: "700",
    },
    signInButton: {
        marginTop: 4,
        width: "100%",
    },
});
