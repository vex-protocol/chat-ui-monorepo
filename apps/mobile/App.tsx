import React, { useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";

import {
    $groupMessages,
    $keyReplaced,
    $messages,
    $user,
    vexService,
} from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getServerOptions } from "./src/lib/config";
import { clearCredentials, keychainKeyStore } from "./src/lib/keychain";
import {
    requestNotificationPermission,
    setupNotificationHandlers,
    showMessageNotification,
} from "./src/lib/notifications";
import { mobileConfig } from "./src/lib/platform";
import { navigationRef } from "./src/navigation/navigationRef";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors, fontFamilies } from "./src/theme";

function App() {
    const keyReplaced = useStore($keyReplaced);
    const user = useStore($user);
    const bootstrappedRef = useRef(false);
    const authProbeInFlightRef = useRef(false);
    const [authNotice, setAuthNotice] = useState<null | string>(null);

    useEffect(() => {
        const unsubNotif = setupNotificationHandlers();
        return () => {
            unsubNotif();
        };
    }, []);

    useEffect(() => {
        if (bootstrappedRef.current) {
            return;
        }
        bootstrappedRef.current = true;
        void (async () => {
            try {
                await requestNotificationPermission();
                const result = await vexService.autoLogin(
                    keychainKeyStore,
                    mobileConfig(),
                    getServerOptions(),
                );
                if (
                    !result.ok &&
                    result.error === "Session expired. Please sign in again."
                ) {
                    setAuthNotice(result.error);
                }
                if (!result.ok && result.error) {
                    // Avoid noisy unhandled rejections and keep bootstrap debuggable.
                    console.warn("[vex-auth] autoLogin failed", result.error);
                }
                // Familiars are populated by vexService.populateState() during bootstrap
            } catch (err: unknown) {
                console.warn(
                    "[vex-auth] bootstrap failed",
                    err instanceof Error ? err.message : String(err),
                );
            }
        })();
    }, []);

    useEffect(() => {
        if (!authNotice) {
            return;
        }
        const timer = setTimeout(() => {
            setAuthNotice(null);
        }, 6000);
        return () => {
            clearTimeout(timer);
        };
    }, [authNotice]);

    useEffect(() => {
        if (!user) {
            return;
        }
        let active = true;
        const pollWhoAmI = async () => {
            if (authProbeInFlightRef.current) {
                return;
            }
            authProbeInFlightRef.current = true;
            try {
                const status = await vexService.probeAuthSession();
                if (!active || status !== "unauthorized") {
                    return;
                }
                await clearCredentials();
                await vexService.logout();
                setAuthNotice("Session expired. Please sign in again.");
            } catch (err: unknown) {
                console.warn(
                    "[vex-auth] whoami poll failed",
                    err instanceof Error ? err.message : String(err),
                );
            } finally {
                authProbeInFlightRef.current = false;
            }
        };
        void pollWhoAmI();
        const interval = setInterval(() => {
            void pollWhoAmI();
        }, 10_000);
        return () => {
            active = false;
            clearInterval(interval);
        };
    }, [user]);

    // Show local notifications for incoming messages by watching atom changes
    const allDms = useStore($messages);
    const allGroups = useStore($groupMessages);
    const prevDmsRef = useRef(allDms);
    const prevGroupsRef = useRef(allGroups);

    useEffect(() => {
        const prev = prevDmsRef.current;
        prevDmsRef.current = allDms;
        for (const [threadID, thread] of Object.entries(allDms)) {
            const prevThread = prev[threadID] ?? [];
            if (thread.length > prevThread.length) {
                const newMsg = thread[thread.length - 1];
                if (newMsg) void showMessageNotification(newMsg);
            }
        }
    }, [allDms]);

    useEffect(() => {
        const prev = prevGroupsRef.current;
        prevGroupsRef.current = allGroups;
        for (const [channelID, thread] of Object.entries(allGroups)) {
            const prevThread = prev[channelID] ?? [];
            if (thread.length > prevThread.length) {
                const newMsg = thread[thread.length - 1];
                if (newMsg) void showMessageNotification(newMsg);
            }
        }
    }, [allGroups]);

    useEffect(() => {
        if (keyReplaced) {
            // Key was replaced server-side — clear stored credentials and force re-auth
            void clearCredentials();
            // Navigation auto-redirects to Auth via $user becoming null
        }
    }, [keyReplaced]);

    return (
        <SafeAreaProvider>
            <StatusBar barStyle="light-content" />
            {authNotice && (
                <View pointerEvents="none" style={styles.noticeWrap}>
                    <View style={styles.noticeCard}>
                        <Text style={styles.noticeText}>{authNotice}</Text>
                    </View>
                </View>
            )}
            <NavigationContainer
                ref={navigationRef}
                theme={{
                    colors: {
                        background: colors.bg,
                        border: colors.borderSubtle,
                        card: colors.card,
                        notification: colors.error,
                        primary: colors.accentMuted,
                        text: colors.textSecondary,
                    },
                    dark: true,
                    fonts: {
                        bold: {
                            fontFamily: fontFamilies.heading,
                            fontWeight: "500",
                        },
                        heavy: {
                            fontFamily: fontFamilies.heading,
                            fontWeight: "500",
                        },
                        medium: {
                            fontFamily: fontFamilies.body,
                            fontWeight: "500",
                        },
                        regular: {
                            fontFamily: fontFamilies.mono,
                            fontWeight: "300",
                        },
                    },
                }}
            >
                <RootNavigator />
            </NavigationContainer>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    noticeCard: {
        backgroundColor: "rgba(36, 40, 50, 0.96)",
        borderColor: "rgba(255,255,255,0.16)",
        borderRadius: 10,
        borderWidth: 1,
        maxWidth: 420,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    noticeText: {
        color: "#E7EAF1",
        fontSize: 13,
        fontWeight: "600",
    },
    noticeWrap: {
        alignItems: "center",
        left: 0,
        position: "absolute",
        right: 0,
        top: 54,
        zIndex: 999,
    },
});

export default App;
