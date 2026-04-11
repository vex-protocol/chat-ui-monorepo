import type { AuthScreenProps } from "../navigation/types";

import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { HourglassIcon } from "../components/HourglassIcon";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { VexLogo } from "../components/VexLogo";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"Welcome">;

export function WelcomeScreen({ navigation }: Props) {
    return (
        <ScreenLayout>
            <View style={styles.container}>
                {/* Logo */}
                <VexLogo size={36} />

                {/* Center content */}
                <View style={styles.center}>
                    {/* Hourglass icon with dashed connection lines */}
                    <View style={styles.iconRow}>
                        <View style={styles.node} />
                        <View style={styles.dashedLine} />
                        <View style={styles.hourglassBox}>
                            <HourglassIcon size={36} />
                        </View>
                        <View style={styles.dashedLine} />
                        <View style={styles.node} />
                    </View>

                    <Text style={styles.heading}>Welcome</Text>
                    <Text style={styles.subtitle}>Secure. Private. Yours.</Text>
                </View>

                {/* Actions */}
                <View style={styles.actions}>
                    <VexButton
                        glow
                        onPress={() => {
                            navigation.navigate("Initialize");
                        }}
                        title="Get Started"
                        variant="outline"
                    />
                    <Text
                        onPress={() => {
                            navigation.navigate("Login");
                        }}
                        style={styles.signInLink}
                    >
                        Sign in
                    </Text>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    By continuing, you agree to our{"\n"}
                    <Text style={styles.footerLink}>Terms</Text> &{" "}
                    <Text style={styles.footerLink}>Privacy Policy</Text>
                </Text>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    actions: {
        alignItems: "center",
        gap: 16,
        width: "100%",
    },
    center: {
        alignItems: "center",
        gap: 12,
    },
    container: {
        alignItems: "center",
        flex: 1,
        justifyContent: "space-between",
    },
    dashedLine: {
        borderColor: colors.accent,
        borderStyle: "dashed",
        borderTopWidth: 1,
        height: 0,
        width: 48,
    },
    footer: {
        ...typography.body,
        color: colors.accent,
        fontSize: 10,
        lineHeight: 16,
        textAlign: "center",
    },
    footerLink: {
        color: colors.accent,
        textDecorationLine: "underline",
    },
    heading: {
        ...typography.heading,
        color: colors.text,
    },
    hourglassBox: {
        alignItems: "center",
        backgroundColor: colors.bg,
        borderColor: colors.accent,
        borderWidth: 1,
        height: 64,
        justifyContent: "center",
        width: 64,
    },
    iconRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 0,
        marginBottom: 24,
    },
    logo: {
        marginTop: 16,
    },
    node: {
        borderColor: colors.accent,
        borderRadius: 5,
        borderWidth: 1,
        height: 10,
        width: 10,
    },
    signInLink: {
        ...typography.button,
        color: colors.muted,
    },
    subtitle: {
        ...typography.body,
        color: colors.muted,
        letterSpacing: 2,
    },
});
