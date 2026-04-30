import type { AuthScreenProps } from "../navigation/types";

import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    StyleSheet,
    Text,
    Vibration,
    View,
} from "react-native";

import { vexService } from "@vex-chat/store";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { getServerOptions } from "../lib/config";
import { approvalCodeForRequest } from "../lib/deviceApprovalCode";
import { keychainKeyStore } from "../lib/keychain";
import { mobileConfig } from "../lib/platform";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"Authenticate">;

const CODE_LENGTH = 6;
const EXPIRY_SECONDS = 5 * 60;
const POLL_MS = 1500;
const SUCCESS_DELAY_MS = 850;

type VerifyPhase = "error" | "success" | "waiting";

export function AuthenticateScreen({ navigation, route }: Props) {
    const [code, setCode] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
    const [error, setError] = useState("");
    const [phase, setPhase] = useState<VerifyPhase>("waiting");
    const [statusText, setStatusText] = useState("Waiting for approval...");
    const pollRef = useRef<null | ReturnType<typeof setInterval>>(null);
    const completingAuthRef = useRef(false);
    const successOpacity = useRef(new Animated.Value(0)).current;
    const successScale = useRef(new Animated.Value(0.86)).current;

    useEffect(() => {
        const requestID = route.params?.requestID;
        if (!requestID) {
            setPhase("error");
            setError(
                "No verification request was provided. Please try signing in again.",
            );
        } else {
            setCode(normalizeCode(requestID).slice(0, CODE_LENGTH));
            void verifyCode(requestID);
        }
        return () => {
            stopPolling();
        };
        // route params are static for this mounted screen
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timer = setInterval(() => {
            setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
        }, 1000);
        return () => {
            clearInterval(timer);
        };
    }, []);

    const minutes = Math.floor(secondsLeft / 60)
        .toString()
        .padStart(2, "0");
    const seconds = (secondsLeft % 60).toString().padStart(2, "0");

    function stopPolling(): void {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
    }

    function ensurePolling(requestID: string): void {
        if (pollRef.current) {
            return;
        }
        pollRef.current = setInterval(() => {
            void verifyCode(requestID);
        }, POLL_MS);
    }

    async function playSuccessAnimation(): Promise<void> {
        Vibration.vibrate(20);
        await new Promise<void>((resolve) => {
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
            ]).start(() => resolve());
        });
    }

    async function handleApproved(requestID: string): Promise<void> {
        if (completingAuthRef.current) {
            return;
        }
        completingAuthRef.current = true;
        stopPolling();
        setError("");
        setPhase("success");
        setStatusText("Code matched. Signing you in...");
        setCode(normalizeCode(requestID).slice(0, CODE_LENGTH));
        await playSuccessAnimation();
        await waitMs(SUCCESS_DELAY_MS);
        const auth = await vexService.autoLogin(
            keychainKeyStore,
            mobileConfig(),
            getServerOptions(),
        );
        if (!auth.ok) {
            completingAuthRef.current = false;
            setPhase("error");
            setError(auth.error ?? "Failed to complete sign-in.");
            setStatusText("");
        }
    }

    async function verifyCode(requestID: string): Promise<void> {
        if (completingAuthRef.current) {
            return;
        }
        try {
            const request = await vexService.getDeviceRequest(requestID);
            if (!request) {
                setPhase("error");
                setError("Verification request was not found on the server.");
                return;
            }
            const requestCode = normalizeCode(
                approvalCodeForRequest(request),
            ).slice(0, CODE_LENGTH);
            if (requestCode.length > 0) {
                setCode(requestCode);
            }
            if (request.status === "approved") {
                await handleApproved(request.requestID);
                return;
            }
            if (request.status === "rejected" || request.status === "expired") {
                stopPolling();
                setPhase("error");
                setError(
                    request.status === "rejected"
                        ? "This verification was rejected."
                        : "This verification has expired.",
                );
                setStatusText("");
                return;
            }
            setPhase("waiting");
            setStatusText("Waiting for approval on your signed-in device...");
            ensurePolling(requestID);
        } catch (err: unknown) {
            setPhase("error");
            setError(
                err instanceof Error ? err.message : "Verification failed.",
            );
            setStatusText("");
        }
    }

    return (
        <ScreenLayout>
            <BackButton />

            <View style={styles.content}>
                <Text style={styles.label}>VERIFICATION REQUIRED</Text>
                <Text style={styles.heading}>Match This Code.</Text>
                <Text style={styles.instructions}>
                    Please make sure the codes match on both devices.
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
                    Expires in: {minutes}:{seconds}
                </Text>

                {phase === "waiting" ? (
                    <View style={styles.waitingCard}>
                        <ActivityIndicator
                            animating
                            color={colors.accent}
                            size="large"
                        />
                        <Text style={styles.statusText}>
                            {statusText || "Waiting for approval..."}
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

                {error !== "" ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : null}

                <View style={styles.links}>
                    {phase === "error" && route.params?.requestID ? (
                        <Text
                            onPress={() => {
                                setError("");
                                setPhase("waiting");
                                setStatusText("Waiting for approval...");
                                void verifyCode(route.params.requestID);
                            }}
                            style={styles.link}
                        >
                            Retry verification
                        </Text>
                    ) : null}
                    <Text
                        onPress={() => {
                            navigation.replace("Login");
                        }}
                        style={styles.link}
                    >
                        Back to login
                    </Text>
                </View>
            </View>
        </ScreenLayout>
    );
}

function normalizeCode(value: string): string {
    return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

async function waitMs(ms: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
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
    errorText: {
        ...typography.body,
        color: colors.error,
        textAlign: "center",
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
    link: {
        ...typography.body,
        color: colors.muted,
    },
    links: {
        gap: 10,
        marginTop: 8,
    },
    statusText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: "center",
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
        borderRadius: 12,
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
    waitingCard: {
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.02)",
        borderColor: "rgba(255,255,255,0.08)",
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 16,
    },
});
