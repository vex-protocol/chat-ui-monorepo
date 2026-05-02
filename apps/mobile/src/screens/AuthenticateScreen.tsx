import type { AuthScreenProps } from "../navigation/types";

import React, { useEffect, useRef, useState } from "react";
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

import { $user } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"Authenticate">;

const CODE_LENGTH = 6;
const EXPIRY_SECONDS = 5 * 60;

type VerifyPhase = "expired" | "success" | "waiting";

export function AuthenticateScreen({ navigation, route }: Props) {
    const user = useStore($user);
    const [code, setCode] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
    const [phase, setPhase] = useState<VerifyPhase>("waiting");
    const successOpacity = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0.86)).current;

    useEffect(() => {
        const requestID = route.params?.requestID;
        if (requestID) {
            setCode(normalizeCode(requestID).slice(0, CODE_LENGTH));
        }
        // route params are static for this mounted screen
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (phase !== "waiting") {
            return;
        }
        const timer = setInterval(() => {
            setSecondsLeft((s) => {
                if (s <= 1) {
                    clearInterval(timer);
                    setPhase("expired");
                    return 0;
                }
                return s - 1;
            });
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, [phase]);

    useEffect(() => {
        if (user && phase !== "success") {
            setPhase("success");
            Vibration.vibrate(20);
            Animated.parallel([
                Animated.timing(successOpacity, {
                    duration: 240,
                    easing: Easing.out(Easing.quad),
                    toValue: 1,
                    useNativeDriver: true,
                }),
                Animated.spring(successScale, {
                    damping: 14,
                    mass: 0.65,
                    stiffness: 260,
                    toValue: 1,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [user, phase, successOpacity, successScale]);

    const minutes = Math.floor(secondsLeft / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");

    function goBackToSignIn(): void {
        navigation.replace("HangTight", { force: true });
    }

    return (
        <ScreenLayout>
            <BackButton />

            <View style={styles.content}>
                <Text style={styles.label}>VERIFICATION REQUIRED</Text>
                <Text style={styles.heading}>Match This Code.</Text>
                <Text style={styles.instructions}>
                    Confirm this code on a device you&apos;re already signed in
                    on. Once approved, this device will sign in automatically.
                </Text>

                <View style={styles.codeRow}>
                    {Array.from({ length: CODE_LENGTH }).map((_, i) => {
                        const filled = i < code.length;
                        return (
                            <CornerBracketBox
                                color={filled ? colors.accent : colors.border}
                                key={i}
                                size={6}
                            >
                                <View
                                    style={[
                                        styles.cell,
                                        filled && styles.cellFilled,
                                    ]}
                                >
                                    <Text style={styles.cellText}>
                                        {code[i] ?? ""}
                                    </Text>
                                </View>
                            </CornerBracketBox>
                        );
                    })}
                </View>

                <Text style={styles.timer}>
                    Expires in {minutes}:{seconds}
                </Text>

                {phase === "waiting" ? (
                    <View style={styles.statusCard}>
                        <ActivityIndicator
                            animating
                            color={colors.accent}
                            size="small"
                        />
                        <Text style={styles.statusText}>
                            Waiting for approval on your other device...
                        </Text>
                    </View>
                ) : null}

                {phase === "success" ? (
                    <Animated.View
                        style={[
                            styles.successCard,
                            {
                                opacity: successOpacity,
                                transform: [{ scale: successScale }],
                            },
                        ]}
                    >
                        <View style={styles.successBadge}>
                            <Text style={styles.successCheck}>✓</Text>
                        </View>
                        <Text style={styles.successText}>
                            Approved. Loading your account...
                        </Text>
                    </Animated.View>
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
            </View>
        </ScreenLayout>
    );
}

function normalizeCode(value: string): string {
    return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

const styles = StyleSheet.create({
    cell: {
        alignItems: "center",
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderWidth: 1,
        height: 56,
        justifyContent: "center",
        width: 48,
    },
    cellFilled: {
        borderColor: colors.accent,
    },
    cellText: {
        ...typography.headingSmall,
        color: colors.text,
        fontSize: 24,
    },
    codeRow: {
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        marginTop: 10,
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
    statusText: {
        ...typography.body,
        color: colors.textSecondary,
        flex: 1,
    },
    successBadge: {
        alignItems: "center",
        backgroundColor: "rgba(74, 222, 128, 0.18)",
        borderColor: "rgba(74, 222, 128, 0.45)",
        borderRadius: 24,
        borderWidth: 1,
        height: 48,
        justifyContent: "center",
        width: 48,
    },
    successCard: {
        alignItems: "center",
        backgroundColor: "rgba(26,42,33,0.45)",
        borderColor: "rgba(74, 222, 128, 0.25)",
        borderWidth: 1,
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    successCheck: {
        color: "#4ADE80",
        fontSize: 30,
        fontWeight: "700",
        marginTop: -2,
    },
    successText: {
        ...typography.body,
        color: "#D8FCE5",
        textAlign: "center",
    },
    timer: {
        ...typography.body,
        color: colors.muted,
        textAlign: "center",
    },
});
