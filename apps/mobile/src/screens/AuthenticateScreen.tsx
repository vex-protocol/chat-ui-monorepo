import type { AuthScreenProps } from "../navigation/types";

import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import { vexService } from "@vex-chat/store";

import { BackButton } from "../components/BackButton";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { getServerOptions } from "../lib/config";
import { approvalCodeForRequest } from "../lib/deviceApprovalCode";
import { keychainKeyStore } from "../lib/keychain";
import { mobileConfig } from "../lib/platform";
import { colors, typography } from "../theme";

type Props = AuthScreenProps<"Authenticate">;

const CODE_LENGTH = 6;
const EXPIRY_SECONDS = 5 * 60;

export function AuthenticateScreen({ navigation, route }: Props) {
    const [code, setCode] = useState("");
    const [secondsLeft, setSecondsLeft] = useState(EXPIRY_SECONDS);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [statusText, setStatusText] = useState("");
    const inputRef = useRef<TextInput>(null);
    const pollRef = useRef<null | ReturnType<typeof setInterval>>(null);
    const completingAuthRef = useRef(false);

    useEffect(() => {
        const initialRequestID = route.params?.requestID;
        if (initialRequestID) {
            setCode(normalizeCode(initialRequestID).slice(0, CODE_LENGTH));
            setStatusText("Verifying pending request...");
            void verifyCode(initialRequestID);
        }
        return () => {
            if (pollRef.current) {
                clearInterval(pollRef.current);
                pollRef.current = null;
            }
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

    async function resolveRequestID(): Promise<null | string> {
        if (route.params?.requestID) {
            return route.params.requestID;
        }
        const normalizedCode = normalizeCode(code);
        if (!normalizedCode) {
            return null;
        }
        const requests = await vexService.listPendingDeviceRequests();
        const match = requests.find((request) => {
            const displayCode = approvalCodeForRequest(request);
            return normalizeCode(displayCode).startsWith(normalizedCode);
        });
        return match?.requestID ?? null;
    }

    async function verifyCode(requestIDOverride?: string): Promise<void> {
        if (busy || completingAuthRef.current) return;
        const normalized = normalizeCode(code);
        if (!requestIDOverride && normalized.length < CODE_LENGTH) {
            setError("Enter the full verification code.");
            return;
        }
        setBusy(true);
        setError("");
        try {
            const requestID = requestIDOverride ?? (await resolveRequestID());
            if (!requestID) {
                setError("Verification request not found.");
                return;
            }
            const request = await vexService.getDeviceRequest(requestID);
            if (!request) {
                setError("Verification request was not found on the server.");
                return;
            }
            if (request.status === "approved") {
                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
                completingAuthRef.current = true;
                setCode(normalizeCode(approvalCodeForRequest(request)));
                setStatusText("Approved. Finishing sign-in...");
                const auth = await vexService.autoLogin(
                    keychainKeyStore,
                    mobileConfig(),
                    getServerOptions(),
                );
                if (!auth.ok) {
                    completingAuthRef.current = false;
                    setError(auth.error ?? "Failed to complete sign-in.");
                    return;
                }
                return;
            }
            if (request.status === "rejected" || request.status === "expired") {
                if (pollRef.current) {
                    clearInterval(pollRef.current);
                    pollRef.current = null;
                }
                setError(
                    request.status === "rejected"
                        ? "This verification was rejected."
                        : "This verification has expired.",
                );
                return;
            }
            setStatusText("Waiting for approval on your signed-in device...");
            setCode(normalizeCode(approvalCodeForRequest(request)));
            if (!pollRef.current) {
                pollRef.current = setInterval(() => {
                    void verifyCode(requestID);
                }, 2000);
            }
        } catch (err: unknown) {
            setError(
                err instanceof Error ? err.message : "Verification failed.",
            );
        } finally {
            setBusy(false);
        }
    }

    return (
        <ScreenLayout>
            <BackButton />

            <View style={styles.content}>
                <Text style={styles.label}>VERIFICATION REQUIRED</Text>
                <Text style={styles.heading}>Authenticate.</Text>

                {/* Code cells */}
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

                {/* Hidden input */}
                <TextInput
                    autoFocus
                    keyboardType="number-pad"
                    maxLength={CODE_LENGTH}
                    onChangeText={(t) => {
                        setCode(t.slice(0, CODE_LENGTH));
                    }}
                    ref={inputRef}
                    style={styles.hiddenInput}
                    value={code}
                />

                <Text style={styles.timer}>
                    Expires in: {minutes}:{seconds}
                </Text>

                <VexButton
                    disabled={code.length < CODE_LENGTH || busy}
                    loading={busy}
                    onPress={() => {
                        void verifyCode();
                    }}
                    title="Confirm Identity"
                />

                {statusText !== "" ? (
                    <View style={styles.statusBox}>
                        <ActivityIndicator
                            animating={busy}
                            color={colors.accent}
                            size="small"
                        />
                        <Text style={styles.statusText}>{statusText}</Text>
                    </View>
                ) : null}
                {error !== "" ? (
                    <Text style={styles.errorText}>{error}</Text>
                ) : null}

                <View style={styles.links}>
                    <Text
                        onPress={() => {
                            setError("");
                            setStatusText("");
                            void verifyCode();
                        }}
                        style={styles.link}
                    >
                        Retry verification
                    </Text>
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
        marginVertical: 16,
    },
    content: {
        flex: 1,
        gap: 20,
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
    hiddenInput: {
        height: 0,
        opacity: 0,
        position: "absolute",
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
        alignItems: "center",
        gap: 12,
        marginTop: 8,
    },
    statusBox: {
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
        justifyContent: "center",
    },
    statusText: {
        ...typography.body,
        color: colors.muted,
        textAlign: "center",
    },
    timer: {
        ...typography.body,
        color: colors.muted,
        textAlign: "center",
    },
});
