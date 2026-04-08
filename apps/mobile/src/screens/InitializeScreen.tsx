import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AuthMethodCard } from "../components/AuthMethodCard";
import { BackButton } from "../components/BackButton";
import { ScreenLayout } from "../components/ScreenLayout";
import { SectionDivider } from "../components/SectionDivider";
import { colors, typography } from "../theme";

type Props = NativeStackScreenProps<any, "Initialize">;

export function InitializeScreen({ navigation }: Props) {
    const goFinalize = (method: string) =>
        { navigation.navigate("Finalize", { method }); };

    return (
        <ScreenLayout>
            <BackButton />

            <ScrollView
                showsVerticalScrollIndicator={false}
                style={styles.scroll}
            >
                <Text style={styles.label}>AUTHORIZATION METHOD</Text>
                <Text style={styles.heading}>Initialize.</Text>

                <SectionDivider label="EXTERNAL" />

                <View style={styles.cards}>
                    <AuthMethodCard
                        badge="3RD PARTY"
                        icon={<Text style={styles.icon}>G</Text>}
                        onPress={() => { goFinalize("google"); }}
                        privacyLabel="LOW PRIVACY"
                        privacyLevel={1}
                        title="Google"
                    />
                    <AuthMethodCard
                        badge="3RD PARTY"
                        icon={<Text style={styles.icon}></Text>}
                        onPress={() => { goFinalize("apple"); }}
                        privacyLabel="LOW PRIVACY"
                        privacyLevel={1}
                        title="Apple"
                    />
                </View>

                <SectionDivider label="INTERNAL" />

                <View style={styles.cards}>
                    <AuthMethodCard
                        icon={<Text style={styles.icon}>@</Text>}
                        onPress={() => { goFinalize("email"); }}
                        privacyLabel="STANDARD"
                        privacyLevel={2}
                        title="Email"
                    />
                    <AuthMethodCard
                        icon={<Text style={styles.icon}>◆</Text>}
                        onPress={() => { goFinalize("wallet"); }}
                        privacyLabel="HIGH PRIVACY"
                        privacyLevel={3}
                        title="Wallet Connect"
                    />
                    <AuthMethodCard
                        icon={<Text style={styles.icon}>⊕</Text>}
                        onPress={() => { goFinalize("username"); }}
                        privacyLabel="MAX PRIVACY"
                        privacyLevel={4}
                        title="Username"
                    />
                </View>

                <Text
                    onPress={() => { navigation.navigate("WelcomeBack"); }}
                    style={styles.footer}
                >
                    Already have an account? Log in
                </Text>
            </ScrollView>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    cards: {
        gap: 10,
    },
    footer: {
        ...typography.body,
        color: colors.muted,
        marginBottom: 16,
        marginTop: 24,
        textAlign: "center",
    },
    heading: {
        ...typography.heading,
        color: colors.text,
        marginTop: 8,
    },
    icon: {
        color: colors.text,
        fontSize: 18,
    },
    label: {
        ...typography.label,
        color: colors.muted,
    },
    scroll: {
        flex: 1,
        marginTop: 24,
    },
});
