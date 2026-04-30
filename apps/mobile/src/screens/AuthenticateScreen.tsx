import type { AuthScreenProps } from "../navigation/types";

import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { vexService } from "@vex-chat/store";

import { ApprovalCodeDisplay } from "../components/ApprovalCodeDisplay";
import { BackButton } from "../components/BackButton";
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

type VerifyPhase = "error" | "loading" | "waiting";

export function AuthenticateScreen({ navigation, route }: Props) {
    const [code, setCode] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
    const [error, setError] = useState("");
    const [phase, setPhase] = useState<VerifyPhase>("waiting");
    const [statusText, setStatusText] = useState("Waiting for approval...");
    const pollRef = useRef<null | ReturnType<typeof setInterval>>(null);
    const pollInFlightRef = useRef(false);
    const completingAuthRef = useRef(false);

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

    async function handleApproved(requestID: string): Promise<void> {
        if (completingAuthRef.current) {
            return;
        }
        completingAuthRef.current = true;
        stopPolling();
        setError("");
        setPhase("loading");
        setStatusText("Approval confirmed. Loading account...");
        setCode(normalizeCode(requestID).slice(0, CODE_LENGTH));
        // Ensure the blue loading state paints before login starts.
        await waitMs(80);
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
            return;
        }
    }

    async function verifyCode(requestID: string): Promise<void> {
        if (completingAuthRef.current || pollInFlightRef.current) {
            return;
        }
        pollInFlightRef.current = true;
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
        } finally {
            pollInFlightRef.current = false;
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

                <ApprovalCodeDisplay code={code} />

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

                {phase === "loading" ? (
                    <View style={styles.loadingCard}>
                        <View style={styles.loadingIconBadge}>
                            <Text style={styles.loadingIcon}>⇣</Text>
                        </View>
                        <ActivityIndicator
                            animating
                            color="#60A5FA"
                            size="small"
                        />
                        <Text style={styles.loadingText}>
                            {statusText || "Loading account..."}
                        </Text>
                    </View>
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
                    {(phase === "waiting" || phase === "error") && (
                        <Text
                            onPress={() => {
                                navigation.replace("Login");
                            }}
                            style={styles.link}
                        >
                            Back to login
                        </Text>
                    )}
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
    loadingCard: {
        alignItems: "center",
        backgroundColor: "rgba(37, 99, 235, 0.14)",
        borderColor: "rgba(96, 165, 250, 0.4)",
        borderRadius: 12,
        borderWidth: 1,
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    loadingIcon: {
        color: "#93C5FD",
        fontSize: 14,
        fontWeight: "700",
        marginTop: -1,
    },
    loadingIconBadge: {
        alignItems: "center",
        backgroundColor: "rgba(59,130,246,0.2)",
        borderColor: "rgba(147,197,253,0.42)",
        borderRadius: 999,
        borderWidth: 1,
        height: 22,
        justifyContent: "center",
        width: 22,
    },
    loadingText: {
        ...typography.body,
        color: "#BFDBFE",
        textAlign: "center",
    },
    statusText: {
        ...typography.body,
        color: colors.textSecondary,
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
