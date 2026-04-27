import React, { useEffect, useRef, useState } from "react";
import {
    AppState,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    $groupMessages,
    $keyReplaced,
    $messages,
    $user,
    vexService,
} from "@vex-chat/store";

import { useStore } from "@nanostores/react";
import { NavigationContainer } from "@react-navigation/native";
import * as BackgroundTask from "expo-background-task";
import * as TaskManager from "expo-task-manager";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { getServerOptions } from "./src/lib/config";
import { clearCredentials, keychainKeyStore } from "./src/lib/keychain";
import {
    requestNotificationPermission,
    setupNotificationHandlers,
    showMessageNotification,
} from "./src/lib/notifications";
import { mobileConfig } from "./src/lib/platform";
import {
    navigateToDevices,
    navigationRef,
} from "./src/navigation/navigationRef";
import { RootNavigator } from "./src/navigation/RootNavigator";
import { colors, fontFamilies } from "./src/theme";

const BACKGROUND_NETWORK_SYNC_TASK = "vex-background-network-sync";

if (!TaskManager.isTaskDefined(BACKGROUND_NETWORK_SYNC_TASK)) {
    TaskManager.defineTask(BACKGROUND_NETWORK_SYNC_TASK, async () => {
        try {
            const result = await vexService.runBackgroundNetworkFetch();
            if (result === "new_data") {
                return BackgroundTask.BackgroundTaskResult.Success;
            }
            if (result === "failed") {
                return BackgroundTask.BackgroundTaskResult.Failed;
            }
            return BackgroundTask.BackgroundTaskResult.Success;
        } catch {
            return BackgroundTask.BackgroundTaskResult.Failed;
        }
    });
}

function App() {
    const keyReplaced = useStore($keyReplaced);
    const user = useStore($user);
    const appStateRef = useRef(AppState.currentState);
    const bootstrappedRef = useRef(false);
    const authProbeInFlightRef = useRef(false);
    const networkRefreshInFlightRef = useRef(false);
    const resumeProbeInFlightRef = useRef(false);
    const [authNotice, setAuthNotice] = useState<null | string>(null);
    const [rateLimitNotice, setRateLimitNotice] = useState<null | string>(null);
    const [pendingApprovalNotice, setPendingApprovalNotice] = useState<null | {
        count: number;
    }>(null);
    const notifiedMailIDsRef = useRef<Set<string>>(new Set());
    const notificationHistoryCutoffMsRef = useRef(0);
    const seenPendingRequestIDsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const unsubNotif = setupNotificationHandlers();
        return () => {
            unsubNotif();
        };
    }, []);

    useEffect(() => {
        if (Platform.OS !== "android") {
            return;
        }
        const registerBackgroundSyncTask = async () => {
            try {
                const status = await BackgroundTask.getStatusAsync();
                if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
                    return;
                }
                const alreadyRegistered =
                    await TaskManager.isTaskRegisteredAsync(
                        BACKGROUND_NETWORK_SYNC_TASK,
                    );
                if (alreadyRegistered) {
                    return;
                }
                await BackgroundTask.registerTaskAsync(
                    BACKGROUND_NETWORK_SYNC_TASK,
                    {
                        minimumInterval: 15 * 60,
                    },
                );
            } catch (err: unknown) {
                console.warn(
                    "[vex-auth] background sync registration failed",
                    err instanceof Error ? err.message : String(err),
                );
            }
        };
        void registerBackgroundSyncTask();
        return;
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
        if (!rateLimitNotice) {
            return;
        }
        const timer = setTimeout(() => {
            setRateLimitNotice(null);
        }, 6000);
        return () => {
            clearTimeout(timer);
        };
    }, [rateLimitNotice]);

    useEffect(() => {
        if (!pendingApprovalNotice) {
            return;
        }
        const timer = setTimeout(() => {
            setPendingApprovalNotice(null);
        }, 7000);
        return () => {
            clearTimeout(timer);
        };
    }, [pendingApprovalNotice]);

    const maybeShowRateLimitNotice = () => {
        if (!vexService.consumeRateLimitNotice()) {
            return;
        }
        setRateLimitNotice(
            "Server is rate limiting requests. Retrying automatically...",
        );
    };

    useEffect(() => {
        notifiedMailIDsRef.current = new Set();
        notificationHistoryCutoffMsRef.current = Date.now();
    }, [user, user?.userID]);

    useEffect(() => {
        seenPendingRequestIDsRef.current = new Set();
        setPendingApprovalNotice(null);
        if (!user?.userID) {
            return;
        }
        let active = true;
        const refreshPendingApprovals = async () => {
            try {
                const requests = await vexService.listPendingDeviceRequests();
                if (!active) {
                    return;
                }
                const pending = requests.filter(
                    (request) => request.status === "pending",
                );
                const nextIDs = new Set(
                    pending.map((request) => request.requestID),
                );
                const hasNewPending = pending.some(
                    (request) =>
                        !seenPendingRequestIDsRef.current.has(
                            request.requestID,
                        ),
                );
                seenPendingRequestIDsRef.current = nextIDs;
                if (pending.length === 0) {
                    setPendingApprovalNotice(null);
                    return;
                }
                if (hasNewPending) {
                    setPendingApprovalNotice({ count: pending.length });
                }
            } catch {
                // ignore request-list errors in toast logic
            }
        };
        void refreshPendingApprovals();
        const unsubscribe = vexService.onDeviceRequestQueueChanged(() => {
            void refreshPendingApprovals();
        });
        return () => {
            active = false;
            unsubscribe();
        };
    }, [user?.userID]);

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
                maybeShowRateLimitNotice();
                if (!active) {
                    return;
                }
                if (status === "offline") {
                    if (networkRefreshInFlightRef.current) {
                        return;
                    }
                    networkRefreshInFlightRef.current = true;
                    try {
                        const refreshed =
                            await vexService.refreshSessionAfterForeground();
                        maybeShowRateLimitNotice();
                        if (refreshed !== "unauthorized") {
                            return;
                        }
                        await clearCredentials();
                        await vexService.logout();
                        setAuthNotice("Session expired. Please sign in again.");
                        return;
                    } finally {
                        networkRefreshInFlightRef.current = false;
                    }
                }
                if (status !== "unauthorized") {
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

    useEffect(() => {
        if (!user) {
            return;
        }
        let active = true;
        const onResume = async () => {
            if (
                resumeProbeInFlightRef.current ||
                networkRefreshInFlightRef.current
            ) {
                return;
            }
            resumeProbeInFlightRef.current = true;
            networkRefreshInFlightRef.current = true;
            try {
                const status = await vexService.refreshSessionAfterForeground();
                maybeShowRateLimitNotice();
                if (!active || status !== "unauthorized") {
                    return;
                }
                await clearCredentials();
                await vexService.logout();
                setAuthNotice("Session expired. Please sign in again.");
            } catch (err: unknown) {
                console.warn(
                    "[vex-auth] app resume refresh failed",
                    err instanceof Error ? err.message : String(err),
                );
            } finally {
                resumeProbeInFlightRef.current = false;
                networkRefreshInFlightRef.current = false;
            }
        };
        const subscription = AppState.addEventListener(
            "change",
            (nextState) => {
                const previous = appStateRef.current;
                appStateRef.current = nextState;
                const resumed =
                    (previous === "background" || previous === "inactive") &&
                    nextState === "active";
                if (resumed) {
                    void onResume();
                }
            },
        );
        return () => {
            active = false;
            subscription.remove();
        };
    }, [user]);

    // Show local notifications for incoming messages by watching atom changes
    const allDms = useStore($messages);
    const allGroups = useStore($groupMessages);
    const prevDmsRef = useRef(allDms);
    const prevGroupsRef = useRef(allGroups);

    useEffect(() => {
        if (!user) {
            return;
        }
        const prev = prevDmsRef.current;
        prevDmsRef.current = allDms;
        for (const [threadID, thread] of Object.entries(allDms)) {
            const prevThread = prev[threadID] ?? [];
            if (thread.length > prevThread.length) {
                const newMsg = thread[thread.length - 1];
                if (!newMsg) {
                    continue;
                }
                if (notifiedMailIDsRef.current.has(newMsg.mailID)) {
                    continue;
                }
                notifiedMailIDsRef.current.add(newMsg.mailID);
                if (
                    isHistoricalMessage(
                        newMsg.timestamp,
                        notificationHistoryCutoffMsRef.current,
                    )
                ) {
                    continue;
                }
                void showMessageNotification(newMsg);
            }
        }
    }, [allDms, user]);

    useEffect(() => {
        if (!user) {
            return;
        }
        const prev = prevGroupsRef.current;
        prevGroupsRef.current = allGroups;
        for (const [channelID, thread] of Object.entries(allGroups)) {
            const prevThread = prev[channelID] ?? [];
            if (thread.length > prevThread.length) {
                const newMsg = thread[thread.length - 1];
                if (!newMsg) {
                    continue;
                }
                if (notifiedMailIDsRef.current.has(newMsg.mailID)) {
                    continue;
                }
                notifiedMailIDsRef.current.add(newMsg.mailID);
                if (
                    isHistoricalMessage(
                        newMsg.timestamp,
                        notificationHistoryCutoffMsRef.current,
                    )
                ) {
                    continue;
                }
                void showMessageNotification(newMsg);
            }
        }
    }, [allGroups, user]);

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
            {rateLimitNotice && (
                <View pointerEvents="none" style={styles.rateNoticeWrap}>
                    <View style={styles.rateNoticeCard}>
                        <Text style={styles.rateNoticeText}>
                            {rateLimitNotice}
                        </Text>
                    </View>
                </View>
            )}
            {pendingApprovalNotice && (
                <View style={styles.approvalNoticeWrap}>
                    <Pressable
                        onPress={() => {
                            setPendingApprovalNotice(null);
                            navigateToDevices();
                        }}
                        style={styles.approvalNoticeCard}
                    >
                        <Text style={styles.approvalNoticeTitle}>
                            Device approval requested
                        </Text>
                        <Text style={styles.approvalNoticeText}>
                            {pendingApprovalNotice.count} pending request
                            {pendingApprovalNotice.count === 1 ? "" : "s"}. Tap
                            to review.
                        </Text>
                    </Pressable>
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
    approvalNoticeCard: {
        backgroundColor: "rgba(26, 42, 33, 0.97)",
        borderColor: "rgba(74, 222, 128, 0.4)",
        borderRadius: 10,
        borderWidth: 1,
        maxWidth: 420,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    approvalNoticeText: {
        color: "rgba(224,255,236,0.9)",
        fontSize: 12,
        marginTop: 2,
    },
    approvalNoticeTitle: {
        color: "#B5F5CD",
        fontSize: 13,
        fontWeight: "700",
    },
    approvalNoticeWrap: {
        alignItems: "center",
        left: 0,
        position: "absolute",
        right: 0,
        top: 98,
        zIndex: 998,
    },
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
    rateNoticeCard: {
        backgroundColor: "rgba(73, 55, 20, 0.96)",
        borderColor: "rgba(255, 205, 99, 0.38)",
        borderRadius: 10,
        borderWidth: 1,
        maxWidth: 460,
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    rateNoticeText: {
        color: "#FFE7AE",
        fontSize: 13,
        fontWeight: "600",
    },
    rateNoticeWrap: {
        alignItems: "center",
        left: 0,
        position: "absolute",
        right: 0,
        top: 54,
        zIndex: 1000,
    },
});

export default App;

function isHistoricalMessage(
    timestamp: string,
    notificationCutoffMs: number,
): boolean {
    const messageMs = Date.parse(timestamp);
    if (!Number.isFinite(messageMs)) {
        return false;
    }
    return messageMs <= notificationCutoffMs;
}
