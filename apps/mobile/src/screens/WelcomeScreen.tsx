import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, typography } from "../theme";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { VexLogo } from "../components/VexLogo";
import { HourglassIcon } from "../components/HourglassIcon";

type Props = NativeStackScreenProps<any, "Welcome">;

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
                        title="Get Started"
                        onPress={() => navigation.navigate("Initialize")}
                        variant="outline"
                        glow
                    />
                    <Text
                        style={styles.signInLink}
                        onPress={() => navigation.navigate("Login")}
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
    container: {
        flex: 1,
        justifyContent: "space-between",
        alignItems: "center",
    },
    logo: {
        marginTop: 16,
    },
    center: {
        alignItems: "center",
        gap: 12,
    },
    iconRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 0,
        marginBottom: 24,
    },
    node: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: colors.accent,
    },
    dashedLine: {
        width: 48,
        height: 0,
        borderTopWidth: 1,
        borderStyle: "dashed",
        borderColor: colors.accent,
    },
    hourglassBox: {
        width: 64,
        height: 64,
        borderWidth: 1,
        borderColor: colors.accent,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.bg,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
    },
    subtitle: {
        ...typography.body,
        color: colors.muted,
        letterSpacing: 2,
    },
    actions: {
        width: "100%",
        gap: 16,
        alignItems: "center",
    },
    signInLink: {
        ...typography.button,
        color: colors.muted,
    },
    footer: {
        ...typography.body,
        color: colors.accent,
        textAlign: "center",
        fontSize: 10,
        lineHeight: 16,
    },
    footerLink: {
        color: colors.accent,
        textDecorationLine: "underline",
    },
});
