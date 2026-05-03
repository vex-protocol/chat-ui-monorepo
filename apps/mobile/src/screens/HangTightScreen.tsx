import type { AuthScreenProps } from "../navigation/types";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Easing,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    Vibration,
    View,
} from "react-native";

import { $signedOutIntent, $user, vexService } from "@vex-chat/store";

import { useStore } from "@nanostores/react";

import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { VexLogo } from "../components/VexLogo";
import { getServerOptions } from "../lib/config";
import { keychainKeyStore, loadCredentials } from "../lib/keychain";
import { mobileConfig } from "../lib/platform";
import { colors, typography } from "../theme";

type Phase = "boot" | "error" | "form";

const HANDLE_PATTERN = /^[A-Za-z0-9_]{3,19}$/;

export function HangTightScreen({
    navigation,
    route,
}: AuthScreenProps<"HangTight">) {
    // `force: true` skips autoLogin and goes straight to the handle form —
    // used when the user explicitly chooses "Sign in with a different
    // account" or "Create an account" from a non-bootstrap entry point.
    const forceForm = route.params?.force === true;
    const _user = useStore($user);
    const [bootError, setBootError] = useState("");
    const [busy, setBusy] = useState(true);
    const [username, setUsername] = useState("");
    const [phase, setPhase] = useState<Phase>("boot");
    const [focused, setFocused] = useState(false);

    // ── Boot spinner animations (kept for the initial loading phase) ────────
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

    // ── Form animations: fade/slide entrance + pulsing input glow ──────────
    const formOpacity = useRef(new Animated.Value(0)).current;
    const formY = useRef(new Animated.Value(20)).current;
    const inputGlow = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const errorShake = useRef(new Animated.Value(0)).current;

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
        if (phase !== "form") {
            return;
        }
        formOpacity.setValue(0);
        formY.setValue(20);
        Animated.parallel([
            Animated.timing(formOpacity, {
                duration: 380,
                easing: Easing.out(Easing.quad),
                toValue: 1,
                useNativeDriver: true,
            }),
            Animated.spring(formY, {
                damping: 14,
                mass: 0.7,
                stiffness: 220,
                toValue: 0,
                useNativeDriver: true,
            }),
        ]).start();

        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(inputGlow, {
                    duration: 1400,
                    easing: Easing.inOut(Easing.quad),
                    toValue: 1,
                    useNativeDriver: false,
                }),
                Animated.timing(inputGlow, {
                    duration: 1400,
                    easing: Easing.inOut(Easing.quad),
                    toValue: 0,
                    useNativeDriver: false,
                }),
            ]),
        );
        loop.start();
        return () => {
            loop.stop();
        };
    }, [phase, formOpacity, formY, inputGlow]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            // Explicit "switch account" / "create account" entries pass
            // force=true so we skip autoLogin and present the handle form.
            if (forceForm) {
                setBusy(false);
                setPhase("form");
                return;
            }

            // After an explicit sign-out we must NOT autoLogin from the
            // kept keychain credentials — that produced an immediate-resign
            // loop. Bounce to WelcomeBack (or Welcome if no creds) and let
            // the user choose to continue or switch accounts.
            if ($signedOutIntent.get()) {
                try {
                    const creds = await loadCredentials();
                    if (cancelled) return;
                    navigation.replace(creds ? "WelcomeBack" : "Welcome");
                } catch {
                    if (!cancelled) {
                        navigation.replace("Welcome");
                    }
                }
                return;
            }

            setBusy(true);
            setBootError("");
            setPhase("boot");
            try {
                const result = await vexService.autoLogin(
                    keychainKeyStore,
                    mobileConfig(),
                    getServerOptions(),
                );
                if (cancelled) return;
                if (!result.ok && !result.error) {
                    setPhase("form");
                } else if (!result.ok) {
                    setBootError(
                        result.error ?? "Could not initialize account.",
                    );
                    setPhase("error");
                }
            } catch (err: unknown) {
                if (!cancelled) {
                    setBootError(
                        err instanceof Error
                            ? err.message
                            : "Could not initialize account.",
                    );
                    setPhase("error");
                }
            } finally {
                if (!cancelled) {
                    setBusy(false);
                }
            }
        };
        void run();
        return () => {
            cancelled = true;
        };
        // navigation reference is stable from the Stack.Navigator but the
        // exhaustive-deps rule can't see that. Intentional empty deps —
        // we only want to run the bootstrap check once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const playInvalidShake = () => {
        Vibration.vibrate(40);
        errorShake.setValue(0);
        Animated.sequence([
            Animated.timing(errorShake, {
                duration: 60,
                toValue: 1,
                useNativeDriver: true,
            }),
            Animated.timing(errorShake, {
                duration: 60,
                toValue: -1,
                useNativeDriver: true,
            }),
            Animated.timing(errorShake, {
                duration: 60,
                toValue: 0.5,
                useNativeDriver: true,
            }),
            Animated.timing(errorShake, {
                duration: 60,
                toValue: 0,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const handleSubmit = () => {
        if (busy) return;
        const candidate = username.trim();
        if (!HANDLE_PATTERN.test(candidate)) {
            setBootError("Handles are 3-19 letters, digits, or underscores.");
            playInvalidShake();
            return;
        }
        Keyboard.dismiss();
        Vibration.vibrate(20);
        Animated.sequence([
            Animated.timing(buttonScale, {
                duration: 80,
                toValue: 0.96,
                useNativeDriver: true,
            }),
            Animated.spring(buttonScale, {
                damping: 12,
                mass: 0.5,
                stiffness: 280,
                toValue: 1,
                useNativeDriver: true,
            }),
        ]).start();

        setBootError("");
        setBusy(true);
        void vexService
            .register(
                candidate,
                "",
                mobileConfig(),
                getServerOptions(),
                keychainKeyStore,
            )
            .then((result) => {
                if (
                    !result.ok &&
                    result.pendingDeviceApproval &&
                    result.pendingRequestID
                ) {
                    // Existing account picked up mid-signup — fall through
                    // to the approval-poll screen. Vibrate to acknowledge.
                    Vibration.vibrate([0, 20, 40, 20]);
                    navigation.replace("Authenticate", {
                        requestID: result.pendingRequestID,
                        ...(result.pendingSignKey !== undefined
                            ? { signKey: result.pendingSignKey }
                            : {}),
                        username: candidate,
                    });
                    return;
                }
                if (!result.ok) {
                    setBootError(result.error ?? "Could not sign in.");
                    playInvalidShake();
                }
            })
            .catch((err: unknown) => {
                setBootError(
                    err instanceof Error ? err.message : "Could not sign in.",
                );
                playInvalidShake();
            })
            .finally(() => {
                setBusy(false);
            });
    };

    const handleRetry = () => {
        setBusy(true);
        setBootError("");
        setPhase("boot");
        void vexService
            .autoLogin(keychainKeyStore, mobileConfig(), getServerOptions())
            .then((result) => {
                if (!result.ok && !result.error) {
                    setPhase("form");
                    return;
                }
                if (!result.ok) {
                    setBootError(
                        result.error ?? "Could not initialize account.",
                    );
                    setPhase("error");
                }
            })
            .catch((err: unknown) => {
                setBootError(
                    err instanceof Error
                        ? err.message
                        : "Could not initialize account.",
                );
                setPhase("error");
            })
            .finally(() => {
                setBusy(false);
            });
    };

    const handleValid = HANDLE_PATTERN.test(username.trim());
    const showHint = username.length > 0;
    const cornerColor = focused ? colors.accent : colors.border;

    const inputGlowOpacity = inputGlow.interpolate({
        inputRange: [0, 1],
        outputRange: focused ? [0.55, 0.85] : [0.18, 0.38],
    });
    const inputGlowScale = inputGlow.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 1.06],
    });
    const shakeX = errorShake.interpolate({
        inputRange: [-1, 1],
        outputRange: [-8, 8],
    });

    if (phase === "form") {
        return (
            <ScreenLayout style={styles.layout}>
                <View pointerEvents="none" style={styles.blackoutLayer} />
                <View pointerEvents="none" style={styles.glowTop} />
                <View pointerEvents="none" style={styles.glowBottom} />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                    style={styles.formWrap}
                >
                    <Animated.View
                        style={[
                            styles.formContent,
                            {
                                opacity: formOpacity,
                                transform: [
                                    { translateY: formY },
                                    { translateX: shakeX },
                                ],
                            },
                        ]}
                    >
                        <Animated.View
                            style={[
                                styles.logoBlock,
                                { transform: [{ scale: pulse }] },
                            ]}
                        >
                            <VexLogo showWordmark size={40} />
                        </Animated.View>

                        <Text style={styles.eyebrow}>SIGN IN</Text>
                        <Text style={styles.heading}>Welcome.</Text>
                        <Text style={styles.subheading}>
                            Enter your handle to sign in or create an account.
                        </Text>

                        <View style={styles.inputArea}>
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.inputGlow,
                                    {
                                        opacity: inputGlowOpacity,
                                        transform: [{ scale: inputGlowScale }],
                                    },
                                ]}
                            />
                            <CornerBracketBox
                                color={cornerColor}
                                size={10}
                                thickness={1.5}
                            >
                                <View style={styles.inputRow}>
                                    <Text style={styles.atSign}>@</Text>
                                    <TextInput
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={!busy}
                                        maxLength={19}
                                        onBlur={() => {
                                            setFocused(false);
                                        }}
                                        onChangeText={(text) => {
                                            setUsername(
                                                text.replace(
                                                    /[^A-Za-z0-9_]/g,
                                                    "",
                                                ),
                                            );
                                            if (bootError) setBootError("");
                                        }}
                                        onFocus={() => {
                                            setFocused(true);
                                            Vibration.vibrate(8);
                                        }}
                                        onSubmitEditing={handleSubmit}
                                        placeholder="handle"
                                        placeholderTextColor={colors.mutedDark}
                                        returnKeyType="go"
                                        selectionColor={colors.accent}
                                        style={styles.input}
                                        value={username}
                                    />
                                    {showHint ? (
                                        <Text
                                            style={[
                                                styles.checkMark,
                                                handleValid
                                                    ? styles.checkOk
                                                    : styles.checkPending,
                                            ]}
                                        >
                                            {handleValid ? "✓" : "·"}
                                        </Text>
                                    ) : null}
                                </View>
                            </CornerBracketBox>
                        </View>

                        <Text style={styles.hint}>
                            3-19 letters, digits, or underscores
                        </Text>

                        {bootError ? (
                            <View style={styles.errorBox}>
                                <Text style={styles.errorText}>
                                    {bootError}
                                </Text>
                            </View>
                        ) : null}

                        <Animated.View
                            style={{ transform: [{ scale: buttonScale }] }}
                        >
                            <VexButton
                                disabled={busy || username.trim().length === 0}
                                glow
                                loading={busy}
                                onPress={handleSubmit}
                                style={styles.signInBtn}
                                title={busy ? "Signing in..." : "Sign in"}
                                variant="primary"
                            />
                        </Animated.View>

                        {!busy ? (
                            <Text style={styles.bottomHint}>
                                We'll create an account if this handle is new,
                                or request approval from one of your existing
                                devices.
                            </Text>
                        ) : null}
                    </Animated.View>
                </KeyboardAvoidingView>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout>
            <View style={styles.bootContainer}>
                <Animated.Text
                    style={[
                        styles.icon,
                        { transform: [{ rotate: rotation }, { scale: pulse }] },
                    ]}
                >
                    ◈
                </Animated.Text>
                <Text style={styles.bootHeading}>Hang tight.</Text>
                <Text style={styles.bootSubtitle}>
                    {phase === "error"
                        ? "Something went sideways"
                        : "We're getting your account ready"}
                </Text>
                {phase === "error" && bootError ? (
                    <View style={styles.errorWrap}>
                        <Text style={styles.errorText}>{bootError}</Text>
                        <VexButton
                            disabled={busy}
                            onPress={handleRetry}
                            title={busy ? "Retrying..." : "Retry"}
                            variant="outline"
                        />
                    </View>
                ) : null}
            </View>
        </ScreenLayout>
    );
}

const styles = StyleSheet.create({
    atSign: {
        ...typography.bodyLarge,
        color: colors.muted,
        fontSize: 18,
        marginRight: 4,
    },
    blackoutLayer: {
        ...StyleSheet.absoluteFill,
        backgroundColor: "#000000",
        opacity: 0.72,
    },
    bootContainer: {
        alignItems: "center",
        flex: 1,
        gap: 12,
        justifyContent: "center",
    },
    bootHeading: {
        ...typography.heading,
        color: colors.text,
    },
    bootSubtitle: {
        ...typography.body,
        color: colors.muted,
    },
    bottomHint: {
        ...typography.body,
        color: "rgba(255,255,255,0.46)",
        fontSize: 11,
        marginTop: 18,
        textAlign: "center",
    },
    checkMark: {
        ...typography.button,
        fontSize: 18,
        marginLeft: 8,
    },
    checkOk: {
        color: "#22c55e",
    },
    checkPending: {
        color: colors.mutedDark,
    },
    errorBox: {
        alignSelf: "stretch",
        backgroundColor: "rgba(229, 57, 53, 0.12)",
        borderColor: "rgba(229, 57, 53, 0.55)",
        borderWidth: 1,
        marginTop: 14,
        paddingHorizontal: 12,
        paddingVertical: 10,
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
    eyebrow: {
        ...typography.label,
        color: "rgba(255,255,255,0.5)",
        marginTop: 18,
    },
    formContent: {
        alignSelf: "center",
        maxWidth: 460,
        paddingHorizontal: 8,
        width: "100%",
    },
    formWrap: {
        flex: 1,
        justifyContent: "center",
        zIndex: 1,
    },
    glowBottom: {
        backgroundColor: colors.accent,
        borderRadius: 140,
        bottom: -50,
        height: 160,
        left: "20%",
        opacity: 0.1,
        position: "absolute",
        width: 160,
    },
    glowTop: {
        backgroundColor: colors.accent,
        borderRadius: 160,
        height: 180,
        opacity: 0.12,
        position: "absolute",
        right: -50,
        top: -60,
        width: 180,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
        marginTop: 6,
    },
    hint: {
        ...typography.body,
        color: "rgba(255,255,255,0.42)",
        fontSize: 11,
        marginTop: 10,
        textAlign: "center",
    },
    icon: {
        color: colors.accent,
        fontSize: 48,
        marginBottom: 24,
    },
    input: {
        color: colors.text,
        flex: 1,
        fontFamily: typography.bodyLarge.fontFamily,
        fontSize: 18,
        letterSpacing: 0.5,
        paddingVertical: 14,
    },
    inputArea: {
        marginTop: 22,
        position: "relative",
    },
    inputGlow: {
        backgroundColor: colors.accent,
        borderRadius: 18,
        bottom: -8,
        elevation: 18,
        left: -10,
        position: "absolute",
        right: -10,
        shadowColor: colors.accent,
        shadowOffset: { height: 0, width: 0 },
        shadowOpacity: 0.75,
        shadowRadius: 28,
        top: -8,
    },
    inputRow: {
        alignItems: "center",
        backgroundColor: colors.input,
        borderColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        flexDirection: "row",
        paddingHorizontal: 14,
    },
    layout: {
        backgroundColor: "#000000",
    },
    logoBlock: {
        alignItems: "flex-start",
    },
    signInBtn: {
        marginTop: 20,
        width: "100%",
    },
    subheading: {
        ...typography.body,
        color: "rgba(255,255,255,0.66)",
        marginTop: 8,
    },
});
