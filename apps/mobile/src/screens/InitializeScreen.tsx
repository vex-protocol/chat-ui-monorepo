import type { AuthScreenProps } from "../navigation/types";

import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { ScreenLayout } from "../components/ScreenLayout";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"Initialize">;

const REGISTRATION_METHODS = [
    {
        description: "Use a username and password on this device",
        id: "username",
        title: "Username + Password",
    },
] as const;

export function InitializeScreen({ navigation }: Props) {
    const goFinalize = (method: string) => {
        navigation.navigate("Finalize", { method });
    };

    return (
        <ScreenLayout style={styles.layout}>
            <View style={styles.container}>
                <View pointerEvents="none" style={styles.blackoutLayer} />
                <View pointerEvents="none" style={styles.glowTop} />
                <View pointerEvents="none" style={styles.glowBottom} />

                <TouchableOpacity
                    onPress={() => {
                        if (navigation.canGoBack()) navigation.goBack();
                    }}
                    style={styles.backInline}
                >
                    <Text style={styles.backInlineText}>Back</Text>
                </TouchableOpacity>

                <Text style={styles.label}>SIGN UP</Text>
                <Text style={styles.heading}>Create account</Text>
                <Text style={styles.subheading}>
                    Private messaging. No third parties.
                </Text>

                <View style={styles.methodsSection}>
                    {REGISTRATION_METHODS.map((method) => (
                        <TouchableOpacity
                            activeOpacity={0.82}
                            key={method.id}
                            onPress={() => {
                                goFinalize(method.id);
                            }}
                            style={styles.methodRow}
                        >
                            <View>
                                <Text style={styles.methodTitle}>
                                    {method.title}
                                </Text>
                                <Text style={styles.methodDescription}>
                                    {method.description}
                                </Text>
                            </View>
                            <Text style={styles.methodAction}>Use this</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text
                    onPress={() => {
                        navigation.navigate("WelcomeBack");
                    }}
                    style={styles.footer}
                >
                    Already have an account? Sign in
                </Text>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    backInline: {
        alignSelf: "flex-start",
        marginBottom: 24,
    },
    backInlineText: {
        ...typography.body,
        color: colors.muted,
        textDecorationLine: "underline",
    },
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
    footer: {
        ...typography.body,
        color: "rgba(255,255,255,0.9)",
        letterSpacing: 1.1,
        marginTop: 28,
        textAlign: "center",
        textTransform: "uppercase",
    },
    glowBottom: {
        backgroundColor: colors.accent,
        borderRadius: 120,
        bottom: -40,
        height: 140,
        left: "28%",
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
        ...typography.headingSmall,
        color: colors.text,
        fontSize: 34,
        marginTop: 4,
    },
    label: {
        ...typography.label,
        color: "rgba(255,255,255,0.56)",
    },
    layout: {
        backgroundColor: "#000000",
    },
    methodAction: {
        ...typography.button,
        color: colors.accent,
        fontSize: 12,
        letterSpacing: 0.6,
    },
    methodDescription: {
        ...typography.body,
        color: "rgba(255,255,255,0.62)",
        fontSize: 12,
        marginTop: 2,
    },
    methodRow: {
        alignItems: "center",
        borderBottomColor: "rgba(255,255,255,0.10)",
        borderBottomWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        paddingVertical: 16,
    },
    methodsSection: {
        borderTopColor: "rgba(255,255,255,0.10)",
        borderTopWidth: 1,
        marginTop: 22,
        paddingTop: 6,
    },
    methodTitle: {
        ...typography.button,
        color: colors.text,
        fontSize: 14,
        letterSpacing: 0.2,
    },
    subheading: {
        ...typography.body,
        color: "rgba(255,255,255,0.70)",
        marginTop: 8,
    },
});
