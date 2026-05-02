import type { AuthScreenProps } from "../navigation/types";

import React, { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from "react-native";

import { $pendingApprovalStage, $user } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { matchingCodeForSignKey } from "../lib/deviceApprovalCode";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"Authenticate">;

const EXPIRY_SECONDS = 5 * 60;
const APPROVE_GLOW = "rgba(74, 222, 128, 0.45)";
const SIGNING_BLUE = "#5DADE2";

type DisplayPhase = "expired" | "loading_account" | "signing_in" | "waiting";

export function AuthenticateScreen({ navigation, route }: Props) {
    const user = useStore($user);
    const stage = useStore($pendingApprovalStage);
    const signKey = route.params?.signKey ?? null;
    const codeChars = matchingCodeForSignKey(signKey);
    const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
    const [expired, setExpired] = useState(false);

    const phase: DisplayPhase = expired
        ? "expired"
        : stage === "loading_account" || user
          ? "loading_account"
          : stage === "signing_in"
            ? "signing_in"
            : "waiting";

    // Soft pulsing focus ring around the code while we're still waiting,
    // so it's clear the digits are "live" and to be matched against the
    // approver's screen.
    const halo = useMemo(() => new Animated.Value(0), []);
    useEffect(() => {
        if (phase !== "waiting") {
            halo.stopAnimation();
            halo.setValue(0);
            return;
        }
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(halo, {
                    duration: 900,
                    easing: Easing.inOut(Easing.quad),
                    toValue: 1,
                    useNativeDriver: true,
                }),
                Animated.timing(halo, {
                    duration: 900,
                    easing: Easing.inOut(Easing.quad),
                    toValue: 0,
                    useNativeDriver: true,
                }),
            ]),
        );
        loop.start();
        return () => {
            loop.stop();
        };
    }, [phase, halo]);

    // Countdown timer — only meaningful while waiting.
    useEffect(() => {
        if (phase !== "waiting") {
            return;
        }
        const timer = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(timer);
                    setExpired(true);
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, [phase]);

    // Tactile cue at each big phase transition.
    useEffect(() => {
        if (phase === "signing_in") {
            Vibration.vibrate([0, 12, 40, 12]);
        } else if (phase === "loading_account") {
            Vibration.vibrate(20);
        }
    }, [phase]);

    const minutes = Math.floor(secondsLeft / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");

    function goBackToSignIn(): void {
        navigation.replace("HangTight", { force: true });
    }

    const haloOpacity = halo.interpolate({
        inputRange: [0, 1],
        outputRange: [0.18, 0.55],
    });
    const haloScale = halo.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.04],
    });

    return (
        <ScreenLayout>
            <BackButton />

            <View style={styles.content}>
                <Text style={styles.label}>VERIFICATION REQUIRED</Text>
                <Text style={styles.heading}>Match This Code.</Text>
                <Text style={styles.instructions}>
                    The same four characters should appear on a device
                    you&apos;re already signed in on. Tap Approve there to
                    finish signing this device in.
                </Text>

                <View style={styles.codeStage}>
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.halo,
                            {
                                opacity: haloOpacity,
                                transform: [{ scale: haloScale }],
                            },
                        ]}
                    />
                    <View style={styles.codeRow}>
                        {codeChars.map((char, i) => (
                            <CornerBracketBox
                                color={colors.error}
                                key={i}
                                size={6}
                                thickness={1.5}
                            >
                                <View style={styles.cell}>
                                    <Text style={styles.cellText}>{char}</Text>
                                </View>
                            </CornerBracketBox>
                        ))}
                    </View>
                </View>

                <Text style={styles.timer}>
                    {phase === "waiting"
                        ? `Expires in ${minutes}:${seconds}`
                        : phase === "expired"
                          ? "Verification window closed"
                          : "Code matched"}
                </Text>

                {phase === "waiting" ? (
                    <View style={styles.statusCard}>
                        <ActivityIndicator
                            animating
                            color={colors.muted}
                            size="small"
                        />
                        <Text style={styles.statusText}>
                            Waiting for approval on your other device...
                        </Text>
                    </View>
                ) : null}

                {phase === "signing_in" ? (
                    <View style={[styles.statusCard, styles.statusCardActive]}>
                        <ActivityIndicator
                            animating
                            color={SIGNING_BLUE}
                            size="small"
                        />
                        <Text style={styles.statusTextActive}>
                            Signing in...
                        </Text>
                    </View>
                ) : null}

                {phase === "loading_account" ? (
                    <View style={[styles.statusCard, styles.statusCardActive]}>
                        <ActivityIndicator
                            animating
                            color={SIGNING_BLUE}
                            size="small"
                        />
                        <Text style={styles.statusTextActive}>
                            Loading your account...
                        </Text>
                    </View>
                ) : null}

                {phase === "expired" ? (
                    <View style={styles.expiredCard}>
                        <Text style={styles.expiredTitle}>
                            This verification expired
                        </Text>
                        <Text style={styles.expiredBody}>
                            Approval wasn&apos;t confirmed in time. Start over
                            to request a fresh code.
                        </Text>
                    </View>
                ) : null}
            </View>

            <View style={styles.footer}>
                {phase === "expired" ? (
                    <View style={styles.primaryButtonRow}>
                        <VexButton
                            glow
                            onPress={goBackToSignIn}
                            title="Retry verification"
                            variant="outline"
                        />
                    </View>
                ) : null}

                {phase === "waiting" || phase === "expired" ? (
                    <TouchableOpacity
                        activeOpacity={0.7}
                        hitSlop={{
                            bottom: 12,
                            left: 12,
                            right: 12,
                            top: 12,
                        }}
                        onPress={goBackToSignIn}
                        style={styles.linkRow}
                    >
                        <Text style={styles.linkArrow}>‹</Text>
                        <Text style={styles.linkText}>Back to sign in</Text>
                    </TouchableOpacity>
                ) : null}
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    cell: {
        alignItems: "center",
        backgroundColor: "rgba(229, 57, 53, 0.08)",
        borderColor: "rgba(229, 57, 53, 0.4)",
        borderWidth: 1,
        height: 64,
        justifyContent: "center",
        width: 56,
    },
    cellText: {
        ...typography.headingSmall,
        color: colors.text,
        fontSize: 28,
        letterSpacing: 1,
    },
    codeRow: {
        flexDirection: "row",
        gap: 12,
        justifyContent: "center",
    },
    codeStage: {
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12,
        paddingVertical: 16,
    },
    content: {
        flex: 1,
        gap: 14,
        marginTop: 32,
    },
    expiredBody: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: "center",
    },
    expiredCard: {
        alignItems: "center",
        backgroundColor: "rgba(229, 57, 53, 0.10)",
        borderColor: "rgba(229, 57, 53, 0.4)",
        borderWidth: 1,
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    expiredTitle: {
        ...typography.body,
        color: colors.error,
        fontWeight: "600",
    },
    footer: {
        alignItems: "center",
        gap: 16,
        paddingBottom: 24,
    },
    halo: {
        backgroundColor: APPROVE_GLOW,
        borderRadius: 50,
        height: 92,
        position: "absolute",
        width: 320,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
    },
    instructions: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    label: {
        ...typography.label,
        color: colors.muted,
    },
    linkArrow: {
        ...typography.body,
        color: colors.accent,
        fontSize: 18,
        marginTop: -2,
    },
    linkRow: {
        alignItems: "center",
        flexDirection: "row",
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    linkText: {
        ...typography.body,
        color: colors.accent,
        textDecorationColor: colors.accent,
        textDecorationLine: "underline",
        textDecorationStyle: "dotted",
    },
    primaryButtonRow: {
        alignItems: "center",
    },
    statusCard: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    statusCardActive: {
        backgroundColor: "rgba(93, 173, 226, 0.10)",
        borderColor: "rgba(93, 173, 226, 0.45)",
    },
    statusText: {
        ...typography.body,
        color: colors.textSecondary,
        flex: 1,
    },
    statusTextActive: {
        ...typography.body,
        color: "#D4ECFB",
        flex: 1,
        fontWeight: "600",
    },
    timer: {
        ...typography.body,
        color: colors.muted,
        textAlign: "center",
    },
});
