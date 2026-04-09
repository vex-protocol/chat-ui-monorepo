import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { getServerOptions } from "../lib/config";
import { mobileConfig } from "../lib/platform";
import {
    clearCredentials,
    keychainKeyStore,
    loadCredentials,
} from "../lib/keychain";
import type { AuthScreenProps } from "../navigation/types";
import { vexService } from "@vex-chat/store";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"WelcomeBack">;

interface SavedCreds {
    deviceID: string;
    deviceKey: string;
    preKey?: string;
    username: string;
}

export function WelcomeBackScreen({ navigation }: Props) {
    const [creds, setCreds] = useState<null | SavedCreds>(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadCredentials().then((c) => {
            if (c) {
                setCreds(c);
            } else {
                // No saved credentials — go straight to login
                navigation.replace("Welcome");
            }
        });
    }, []);

    async function handleContinue() {
        if (!creds) {
            setError("No saved credentials found.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            navigation.navigate("HangTight");

            const result = await vexService.autoLogin(
                keychainKeyStore,
                mobileConfig(),
                getServerOptions(),
            );

            if (!result.ok) {
                if (navigation.canGoBack()) navigation.goBack();
                setError(result.error || "Failed to sign in");
                setLoading(false);
                return;
            }
            // Success — RootNavigator auto-switches to App when $user becomes non-null
        } catch (err: unknown) {
            // Navigate back so the user sees the error instead of being stuck on HangTight
            if (navigation.canGoBack()) navigation.goBack();
            setError(err instanceof Error ? err.message : "Failed to sign in");
            setLoading(false);
        }
    }

    async function handleSwitchAccount() {
        await clearCredentials();
        navigation.navigate("Login");
    }

    return (
        <ScreenLayout>
            <BackButton />

            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.heading}>Welcome back.</Text>
                    <Text style={styles.subtitle}>
                        Continue where you left off
                    </Text>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Text style={styles.errorText}>{error}</Text>
                    </View>
                ) : null}

                {/* User card */}
                {creds ? (
                    <CornerBracketBox color={colors.border} size={10}>
                        <View style={styles.userCard}>
                            <View style={styles.avatar}>
                                <Text style={styles.avatarText}>
                                    {creds.username?.charAt(0).toUpperCase() ??
                                        "?"}
                                </Text>
                            </View>
                            <View style={styles.userInfo}>
                                <Text style={styles.handle}>
                                    @{creds.username}
                                </Text>
                                <Text style={styles.deviceId}>
                                    {creds.username}@vex.wtf
                                </Text>
                            </View>
                        </View>
                    </CornerBracketBox>
                ) : (
                    <Text style={styles.noCredsText}>
                        No saved account found.
                    </Text>
                )}

                {/* Continue button */}
                <View style={styles.buttonRow}>
                    <VexButton
                        disabled={!creds}
                        glow
                        loading={loading}
                        onPress={handleContinue}
                        title="Continue"
                        variant="outline"
                    />
                </View>
            </View>

            {/* Footer links */}
            <View style={styles.footer}>
                <View style={styles.footerSection}>
                    <Text style={styles.footerLabel}>Not you?</Text>
                    <Text
                        onPress={handleSwitchAccount}
                        style={styles.footerLink}
                    >
                        Sign in with a different account
                    </Text>
                </View>

                <View style={styles.divider} />

                <View style={styles.footerSection}>
                    <Text style={styles.footerLabel}>New here?</Text>
                    <Text
                        onPress={() => { navigation.navigate("Initialize"); }}
                        style={styles.footerLink}
                    >
                        Create an account
                    </Text>
                </View>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    avatar: {
        alignItems: "center",
        backgroundColor: colors.accentDark,
        height: 48,
        justifyContent: "center",
        width: 48,
    },
    avatarText: {
        ...typography.headingSmall,
        color: colors.text,
        fontSize: 20,
    },
    buttonRow: {
        alignItems: "center",
    },
    content: {
        flex: 1,
        gap: 24,
        justifyContent: "center",
    },
    deviceId: {
        ...typography.body,
        color: colors.muted,
    },
    divider: {
        backgroundColor: colors.border,
        height: 1,
        width: 80,
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
    footer: {
        alignItems: "center",
        gap: 16,
        paddingBottom: 16,
    },
    footerLabel: {
        ...typography.body,
        color: colors.muted,
    },
    footerLink: {
        ...typography.body,
        color: colors.accent,
    },
    footerSection: {
        alignItems: "center",
        gap: 4,
    },
    handle: {
        ...typography.button,
        color: colors.text,
        fontSize: 16,
    },
    header: {
        alignItems: "center",
        gap: 8,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
        textAlign: "center",
    },
    noCredsText: {
        ...typography.body,
        color: colors.muted,
        paddingVertical: 32,
        textAlign: "center",
    },
    subtitle: {
        ...typography.body,
        color: colors.muted,
        textAlign: "center",
    },
    userCard: {
        alignItems: "center",
        backgroundColor: colors.surface,
        flexDirection: "row",
        gap: 16,
        padding: 20,
    },
    userInfo: {
        gap: 4,
    },
});
