import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { useStore } from "@nanostores/react";

import { ScreenLayout } from "../components/ScreenLayout";
import { $user } from "@vex-chat/store";
import { colors, typography } from "../theme";

export function HangTightScreen() {
    const _user = useStore($user);
    const spin = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spin, {
                duration: 3000,
                easing: Easing.linear,
                toValue: 1,
                useNativeDriver: true,
            }),
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    duration: 1000,
                    toValue: 1.1,
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    duration: 1000,
                    toValue: 1,
                    useNativeDriver: true,
                }),
            ]),
        ).start();
    }, [spin, pulse]);

    // Auto-transition handled by RootNavigator when $user becomes non-null
    // This screen is just a visual holding state

    const rotation = spin.interpolate({
        inputRange: [0, 1],
        outputRange: ["0deg", "360deg"],
    });

    return (
        <ScreenLayout>
            <View style={styles.container}>
                <Animated.Text
                    style={[
                        styles.icon,
                        { transform: [{ rotate: rotation }, { scale: pulse }] },
                    ]}
                >
                    ◈
                </Animated.Text>
                <Text style={styles.heading}>Hang tight.</Text>
                <Text style={styles.subtitle}>
                    We're getting your account ready
                </Text>
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: "center",
        flex: 1,
        gap: 12,
        justifyContent: "center",
    },
    heading: {
        ...typography.heading,
        color: colors.text,
    },
    icon: {
        color: colors.accent,
        fontSize: 48,
        marginBottom: 24,
    },
    subtitle: {
        ...typography.body,
        color: colors.muted,
    },
});
