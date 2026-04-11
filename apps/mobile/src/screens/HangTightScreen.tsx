import React, { useEffect, useMemo } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { $user } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ScreenLayout } from "../components/ScreenLayout";
import { colors, typography } from "../theme";

export function HangTightScreen() {
    const _user = useStore($user);
    // Use useMemo instead of useRef(...).current so the eslint
    // react-hooks/refs rule is satisfied (it flags accessing .current
    // during render). Animated.Value is stable across renders so
    // useMemo with an empty dep array is equivalent in behavior.
    const spin = useMemo(() => new Animated.Value(0), []);
    const pulse = useMemo(() => new Animated.Value(1), []);
    const rotation = useMemo(
        () =>
            spin.interpolate({
                inputRange: [0, 1],
                outputRange: ["0deg", "360deg"],
            }),
        [spin],
    );

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
