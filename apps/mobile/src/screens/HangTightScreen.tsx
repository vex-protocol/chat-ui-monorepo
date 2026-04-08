import React, { useEffect, useRef } from "react";
import { View, Text, Animated, Easing, StyleSheet } from "react-native";
import { useStore } from "@nanostores/react";
import { $user } from "../store";
import { colors, typography } from "../theme";
import { ScreenLayout } from "../components/ScreenLayout";

export function HangTightScreen() {
    const user = useStore($user);
    const spin = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.timing(spin, {
                toValue: 1,
                duration: 3000,
                easing: Easing.linear,
                useNativeDriver: true,
            }),
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulse, {
                    toValue: 1,
                    duration: 1000,
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
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
    },
    icon: {
        fontSize: 48,
        color: colors.accent,
        marginBottom: 24,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
    },
    subtitle: {
        ...typography.body,
        color: colors.muted,
    },
});
