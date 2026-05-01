import React, { useEffect, useMemo, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";

import { $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { getServerOptions } from "../lib/config";
import { keychainKeyStore } from "../lib/keychain";
import { mobileConfig } from "../lib/platform";
import { colors, typography } from "../theme";

export function HangTightScreen() {
    const _user = useStore($user);
    const [bootError, setBootError] = useState("");
    const [booting, setBooting] = useState(true);
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

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            setBooting(true);
            setBootError("");
            try {
                const result = await vexService.bootstrapAuth(
                    keychainKeyStore,
                    mobileConfig(),
                    getServerOptions(),
                );
                if (!cancelled && !result.ok) {
                    setBootError(
                        result.error ?? "Could not initialize account.",
                    );
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    setBootError(
                        err instanceof Error
                            ? err.message
                            : "Could not initialize account.",
                    );
                }
            } finally {
                if (!cancelled) {
                    setBooting(false);
                }
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, []);

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
                {bootError ? (
                    <View style={styles.errorWrap}>
                        <Text style={styles.errorText}>{bootError}</Text>
                        <VexButton
                            disabled={booting}
                            onPress={() => {
                                setBooting(true);
                                setBootError("");
                                void vexService
                                    .bootstrapAuth(
                                        keychainKeyStore,
                                        mobileConfig(),
                                        getServerOptions(),
                                    )
                                    .then((result) => {
                                        if (!result.ok) {
                                            setBootError(
                                                result.error ??
                                                    "Could not initialize account.",
                                            );
                                        }
                                    })
                                    .catch((err: unknown) => {
                                        setBootError(
                                            err instanceof Error
                                                ? err.message
                                                : "Could not initialize account.",
                                        );
                                    })
                                    .finally(() => {
                                        setBooting(false);
                                    });
                            }}
                            title={booting ? "Retrying..." : "Retry"}
                            variant="outline"
                        />
                    </View>
                ) : null}
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
    errorText: {
        ...typography.body,
        color: colors.error,
        textAlign: "center",
    },
    errorWrap: {
        alignItems: "center",
        gap: 10,
        marginTop: 14,
        maxWidth: 320,
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
