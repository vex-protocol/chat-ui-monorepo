import type { Message } from "@vex-chat/libvex";

import React, { useEffect, useRef, useState } from "react";
import {
    AppState,
    Platform,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    Vibration,
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
import { hydrateDevOptionsUnlocked } from "./src/lib/devMode";
import {
    $alwaysOnEnabled,
    ensureAlwaysOnRunning,
    hydrateAlwaysOnPreference,
    isAlwaysOnSupported,
    startAlwaysOn,
    suspendAlwaysOn,
} from "./src/lib/foregroundService";
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
const BACKGROUND_NOTIFICATION_LIMIT = 8;
// Cap on the in-memory mailID dedup sets. Long-lived FGS sessions
// would otherwise grow these without bound — every message ever
// notified, retained for the life of the process. 1k is a generous
// ceiling; it covers many days of normal use, and the only correctness
// risk of evicting older IDs is "we might re-notify on a duplicate
// from very far in the past," which the historical-cutoff timestamp
// already filters out separately.
const NOTIFIED_MAILID_DEDUP_CAP = 1000;

/**
 * Bounded `Set<string>` with FIFO eviction: when adding past the cap,
 * the oldest inserted entry is dropped.
 *
 * `Set` already iterates in insertion order in V8/Hermes, so the
 * "oldest" entry is `inner.values().next().value`. That's the only
 * non-obvious thing about this implementation — the rest is a thin
 * surface compatible with the parts of `Set<string>` we use here
 * (`has`, `add`, `clear`).
 */
class BoundedStringSet {
    private readonly cap: number;
    private readonly inner = new Set<string>();

    constructor(cap: number) {
        this.cap = cap;
    }

    add(value: string): void {
        if (this.inner.has(value)) {
            return;
        }
        this.inner.add(value);
        while (this.inner.size > this.cap) {
            const oldest = this.inner.values().next().value;
            if (oldest === undefined) {
                break;
            }
            this.inner.delete(oldest);
        }
    }

    clear(): void {
        this.inner.clear();
    }

    has(value: string): boolean {
        return this.inner.has(value);
    }
}

const runtimeNotifiedMailIDs = new BoundedStringSet(NOTIFIED_MAILID_DEDUP_CAP);

if (!TaskManager.isTaskDefined(BACKGROUND_NETWORK_SYNC_TASK)) {
    TaskManager.defineTask(BACKGROUND_NETWORK_SYNC_TASK, async () => {
        try {
            const knownMailIDsBeforeSync = collectKnownMailIDs();
            const result = await vexService.runBackgroundNetworkFetch();
            if (result === "new_data" && AppState.currentState !== "active") {
                await notifyMessagesDownloadedInBackground(
                    knownMailIDsBeforeSync,
                );
            }
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
    const notifiedMailIDsRef = useRef<BoundedStringSet>(
        new BoundedStringSet(NOTIFIED_MAILID_DEDUP_CAP),
    );
    const notificationHistoryCutoffMsRef = useRef(0);
    const seenPendingRequestIDsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const unsubNotif = setupNotificationHandlers();
        // Hydrate the developer-options easter-egg flag from
        // SecureStore. Fire-and-forget — the atom defaults to false
        // until the persisted value lands.
        void hydrateDevOptionsUnlocked();
        // Hydrate the always-on connection preference. Service start
        // is gated on the sign-in transition below, so we don't spin
        // up a foreground service before there's anything to connect.
        if (isAlwaysOnSupported()) {
            void hydrateAlwaysOnPreference();
        }
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

    // Resilience: retry `autoLogin` on AppState resume when we still
    // don't have a logged-in user.
    //
    // The bootstrap effect above only runs once per process lifetime,
    // so a transient failure at cold start (device offline, server
    // briefly down, captive portal) leaves the user stuck on the auth
    // screen until they manually try to sign in. Repeating the attempt
    // every time the device comes back to foreground papers over the
    // common "I came back from being offline" case automatically.
    //
    // Notes:
    //   - Top-level AppState listener (not gated on `user`), because
    //     the user-gated effects below short-circuit when `user` is
    //     null and we need to act in exactly that case.
    //   - Throttled to once per 30s so a flaky network can't turn
    //     resume-storms into autoLogin-storms.
    //   - `vexService.autoLogin` is internally idempotent (returns
    //     immediately with ok:true if a session already exists), so
    //     it's safe to call even if a competing path has just signed
    //     us in.
    useEffect(() => {
        let lastAttemptAt = 0;
        const RETRY_THROTTLE_MS = 30_000;
        const subscription = AppState.addEventListener("change", (next) => {
            if (next !== "active") {
                return;
            }
            if (!bootstrappedRef.current) {
                // Bootstrap hasn't even started yet (rare race); let
                // it have the first attempt.
                return;
            }
            if ($user.get()) {
                return;
            }
            const now = Date.now();
            if (now - lastAttemptAt < RETRY_THROTTLE_MS) {
                return;
            }
            lastAttemptAt = now;
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        void (async () => {
                            try {
                                const result = await vexService.autoLogin(
                                    keychainKeyStore,
                                    mobileConfig(),
                                    getServerOptions(),
                                );
                                if (
                                    !result.ok &&
                                    result.error ===
                                        "Session expired. Please sign in again."
                                ) {
                                    setAuthNotice(result.error);
                                }
                            } catch (err: unknown) {
                                console.warn(
                                    "[vex-auth] resume retry failed",
                                    err instanceof Error
                                        ? err.message
                                        : String(err),
                                );
                            }
                        })();
                    }, 50);
                });
            });
        });
        return () => {
            subscription.remove();
        };
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
        notifiedMailIDsRef.current = new BoundedStringSet(
            NOTIFIED_MAILID_DEDUP_CAP,
        );
        runtimeNotifiedMailIDs.clear();
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
                    // Soft tactile cue so the approver notices a fresh
                    // device request even if the toast is partly out of view.
                    Vibration.vibrate([0, 18, 60, 18]);
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
                } finally {
                    networkRefreshInFlightRef.current = false;
                }
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
                    // Defer the resume probe past the next paint so
                    // the UI thread can finish the activity foreground
                    // transition (unlock animation, layout) before we
                    // start the heavy work (HTTP probe + possible
                    // WebSocket reconnect + inbox sync). Two RAFs
                    // guarantees we're after a committed frame; the
                    // small setTimeout adds a touch more headroom for
                    // slower devices. This is the difference between
                    // "the user sees the chat list pop in" and "the
                    // user sees an ANR dialog because the JS thread
                    // was saturated during the unlock window."
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            setTimeout(() => {
                                // Re-assert the FGS first: if the OS
                                // killed it silently while we were
                                // backgrounded, this brings it back.
                                // Cheap when it's already alive
                                // (idempotent notifee call). Done
                                // before onResume so the watchdog
                                // reset (inside startAlwaysOn) lands
                                // before refreshSessionAfterForeground
                                // reads `isWebsocketLikelyHealthy`.
                                void ensureAlwaysOnRunning();
                                void onResume();
                            }, 50);
                        });
                    });
                }
            },
        );
        return () => {
            active = false;
            subscription.remove();
        };
    }, [user]);

    // Show local notifications for incoming messages.
    //
    // We deliberately do NOT useStore() the message atoms here:
    //   - This component renders no UI that depends on them.
    //   - useStore() forces a re-render of the App root on every atom
    //     update; during a wake-from-sleep backlog (foreground service
    //     pulling queued mail) that's dozens of full-tree reconciles
    //     in a few hundred ms, on the same JS thread Android wants
    //     responsive for the activity foreground transition.
    //
    // Subscribing directly to the atoms keeps the side effect (queue
    // a notification when a thread grows) without taxing React's
    // render path. The notification queue inside `notifications.ts`
    // serializes the resulting bridge calls so the burst can't
    // saturate the JS thread either way.
    useEffect(() => {
        if (!user) {
            return;
        }
        let prevDms = $messages.get();
        let prevGroups = $groupMessages.get();
        const queueIfNew = (newMsg: Message): void => {
            if (
                notifiedMailIDsRef.current.has(newMsg.mailID) ||
                runtimeNotifiedMailIDs.has(newMsg.mailID)
            ) {
                return;
            }
            notifiedMailIDsRef.current.add(newMsg.mailID);
            runtimeNotifiedMailIDs.add(newMsg.mailID);
            if (
                isHistoricalMessage(
                    newMsg.timestamp,
                    notificationHistoryCutoffMsRef.current,
                )
            ) {
                return;
            }
            void showMessageNotification(newMsg);
        };
        const handleDelta = (
            next: Record<string, Message[]>,
            prev: Record<string, Message[]>,
        ): void => {
            for (const [threadID, thread] of Object.entries(next)) {
                const prevThread = prev[threadID] ?? [];
                if (thread.length <= prevThread.length) {
                    continue;
                }
                const newMsg = thread[thread.length - 1];
                if (!newMsg) {
                    continue;
                }
                queueIfNew(newMsg);
            }
        };
        const unsubDms = $messages.subscribe((next) => {
            const prev = prevDms;
            prevDms = next;
            handleDelta(next, prev);
        });
        const unsubGroups = $groupMessages.subscribe((next) => {
            const prev = prevGroups;
            prevGroups = next;
            handleDelta(next, prev);
        });
        return () => {
            unsubDms();
            unsubGroups();
        };
    }, [user]);

    useEffect(() => {
        if (keyReplaced) {
            // Key was replaced server-side — clear stored credentials and force re-auth
            void clearCredentials();
            // Navigation auto-redirects to Auth via $user becoming null
        }
    }, [keyReplaced]);

    // Drop the foreground service (and its persistent "Connected"
    // notification) on sign-out, and resume it on sign-in if the user
    // had it enabled. The persisted preference (SecureStore) is the
    // source of truth across sign-out/sign-in cycles.
    const userPresentRef = useRef(user != null);
    useEffect(() => {
        const wasPresent = userPresentRef.current;
        const present = user != null;
        userPresentRef.current = present;
        if (!isAlwaysOnSupported()) {
            return;
        }
        if (wasPresent && !present) {
            void suspendAlwaysOn().catch(() => {
                // Best-effort; the service will stop with the process
                // anyway when Android reclaims it.
            });
        }
        if (!wasPresent && present) {
            // User just signed in. Wait for the persisted preference
            // to land (the boot effect kicks off hydration but it's
            // async; autoLogin can complete first), then start the
            // FGS if the user had it enabled.
            void (async () => {
                try {
                    await hydrateAlwaysOnPreference();
                    if ($alwaysOnEnabled.get()) {
                        await startAlwaysOn();
                    }
                } catch (err: unknown) {
                    console.warn(
                        "[vex-fgs] post-login start failed",
                        err instanceof Error ? err.message : String(err),
                    );
                }
            })();
        }
    }, [user]);

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

function collectKnownMailIDs(): Set<string> {
    const known = new Set<string>();
    const directMessages = $messages.get();
    const groupMessages = $groupMessages.get();
    for (const thread of Object.values(directMessages)) {
        for (const msg of thread) {
            known.add(msg.mailID);
        }
    }
    for (const thread of Object.values(groupMessages)) {
        for (const msg of thread) {
            known.add(msg.mailID);
        }
    }
    return known;
}

function collectLatestMessagesByThread(
    threads: Record<string, Message[]>,
    knownBefore: Set<string>,
): Message[] {
    const latest: Message[] = [];
    for (const thread of Object.values(threads)) {
        for (let i = thread.length - 1; i >= 0; i -= 1) {
            const candidate = thread[i];
            if (!candidate) {
                continue;
            }
            if (
                knownBefore.has(candidate.mailID) ||
                runtimeNotifiedMailIDs.has(candidate.mailID)
            ) {
                continue;
            }
            latest.push(candidate);
            break;
        }
    }
    return latest;
}

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

async function notifyMessagesDownloadedInBackground(
    knownBeforeSync: Set<string>,
): Promise<void> {
    const directLatest = collectLatestMessagesByThread(
        $messages.get(),
        knownBeforeSync,
    );
    const groupLatest = collectLatestMessagesByThread(
        $groupMessages.get(),
        knownBeforeSync,
    );
    const candidates = [...directLatest, ...groupLatest]
        .sort(
            (a, b) =>
                (Date.parse(a.timestamp) || 0) - (Date.parse(b.timestamp) || 0),
        )
        .slice(-BACKGROUND_NOTIFICATION_LIMIT);
    for (const msg of candidates) {
        runtimeNotifiedMailIDs.add(msg.mailID);
        await showMessageNotification(msg);
    }
}
