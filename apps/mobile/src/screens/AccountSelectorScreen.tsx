import type { IdentityBackup } from "../lib/identityBackup";
import type { AuthScreenProps } from "../navigation/types";
import type { KeyStore, StoredCredentials } from "@vex-chat/libvex";

import React, { useCallback, useState } from "react";
import {
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { vexService } from "@vex-chat/store";

import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";

import { Avatar } from "../components/Avatar";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { VexLogo } from "../components/VexLogo";
import { getServerOptions, getServerUrl } from "../lib/config";
import { haptic } from "../lib/haptics";
import { parseIdentityBackup, pickIdentityBackup } from "../lib/identityBackup";
import {
    clearCredentials,
    keychainKeyStore,
    type KnownAccount,
    listKnownAccounts,
    setActiveUsername,
    setUserIDForUsername,
} from "../lib/keychain";
import { mobileConfig } from "../lib/platform";
import { hydrateLocalMessageRetention } from "../lib/retentionPreference";
import { colors, typography } from "../theme";

interface AccountRowProps {
    account: KnownAccount;
    busy: boolean;
    disabled: boolean;
    onLongPress: () => void;
    onPress: () => void;
}

type Props = AuthScreenProps<"AccountSelector">;

interface TransientSlot {
    creds: null | StoredCredentials;
}

/**
 * OS-style account picker. Lists every account whose credentials are still
 * stored on this device and lets the user pick one to auto-login as. Long-
 * pressing a row offers an explicit "Remove from this device" confirmation
 * — the only path that touches key material.
 *
 * The picker is the new landing point for any unauthenticated entry: when
 * the app boots without an active session, we show this screen instead of
 * the legacy single-account "Welcome back" card. The user can always tap
 * "Add another account" to register or sign in as someone new without
 * disturbing existing slots.
 */
export function AccountSelectorScreen({ navigation }: Props) {
    const [accounts, setAccounts] = useState<KnownAccount[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const [signingInUsername, setSigningInUsername] = useState<null | string>(
        null,
    );
    const [errorText, setErrorText] = useState<null | string>(null);

    const refresh = useCallback(async () => {
        const list = await listKnownAccounts();
        setAccounts(list);
        setHydrated(true);
    }, []);

    // Re-read on every focus — the user may have added or removed an account
    // via the "Add another account" path and bounced back. `useFocusEffect`
    // also runs once on mount, so it doubles as the initial-load trigger.
    useFocusEffect(
        useCallback(() => {
            void refresh();
        }, [refresh]),
    );

    const handleSelect = useCallback(
        async (account: KnownAccount) => {
            if (signingInUsername !== null) {
                return;
            }
            haptic("confirm");
            setErrorText(null);
            setSigningInUsername(account.username);
            try {
                // Flip the active-user pointer *before* invoking autoLogin so
                // the keystore returns the correct slot. We never delete the
                // previously-active user's keys — they stay parked and
                // available in the picker for next time.
                await setActiveUsername(account.username);
                // Drive the login from here rather than navigating to
                // HangTight. autoLogin clears `$signedOutIntent` internally
                // and, on success, flips `$user` non-null which causes the
                // RootNavigator to swap from AuthStack to the App stack
                // automatically — no navigation required.
                await hydrateLocalMessageRetention();
                const result = await vexService.autoLogin(
                    keychainKeyStore,
                    mobileConfig(),
                    getServerOptions(),
                );
                if (!result.ok) {
                    setErrorText(
                        result.error ??
                            "Could not sign in. The keys for this account may have been revoked from another device.",
                    );
                    // Re-read in case autoLogin's failure path scrubbed the
                    // slot (it does so on confirmed-unauthorized responses).
                    await refresh();
                }
            } catch (err: unknown) {
                setErrorText(
                    err instanceof Error
                        ? err.message
                        : "Could not sign in to this account.",
                );
                await refresh();
            } finally {
                setSigningInUsername(null);
            }
        },
        [refresh, signingInUsername],
    );

    const handleRemove = useCallback(
        (account: KnownAccount) => {
            haptic("destructive");
            Alert.alert(
                `Remove @${account.username}?`,
                "This deletes this account's device key from this phone. " +
                    "You'll need to approve a fresh sign-in from another " +
                    "signed-in device to use this account here again.",
                [
                    { style: "cancel", text: "Cancel" },
                    {
                        onPress: () => {
                            void (async () => {
                                await clearCredentials(account.username);
                                await refresh();
                            })();
                        },
                        style: "destructive",
                        text: "Remove",
                    },
                ],
            );
        },
        [refresh],
    );

    const handleAddAccount = useCallback(() => {
        haptic("tap");
        navigation.navigate("HangTight", { force: true });
    }, [navigation]);

    const applyParsedBackup = useCallback(
        async (backup: IdentityBackup) => {
            // Server-host gate: the deviceKey only authenticates against the
            // cluster that minted it. If the user's currently configured
            // server doesn't match the backup, refuse rather than misleading
            // them with a "device revoked" error.
            const currentHost = sanitizeHost(getServerUrl());
            const backupHost = sanitizeHost(backup.server);
            if (currentHost !== backupHost) {
                setErrorText(
                    `This backup is for ${backup.server}, but you are connected to ${getServerUrl()}. Switch servers and try again.`,
                );
                return;
            }

            // If a slot already exists for this username on this device, ask
            // before clobbering it. Without this prompt, a stale backup
            // could silently destroy the user's working keys.
            const overwriting = accounts.some(
                (a) => a.username === backup.username,
            );
            if (overwriting) {
                const confirmed = await new Promise<boolean>((resolve) => {
                    Alert.alert(
                        `Replace @${backup.username}?`,
                        "An account with this username is already on this device. Restoring will replace its device key with the one from the backup.",
                        [
                            {
                                onPress: () => {
                                    resolve(false);
                                },
                                style: "cancel",
                                text: "Cancel",
                            },
                            {
                                onPress: () => {
                                    resolve(true);
                                },
                                style: "destructive",
                                text: "Replace",
                            },
                        ],
                    );
                });
                if (!confirmed) {
                    return;
                }
            }

            setSigningInUsername(backup.username);
            try {
                const result = await restoreFromBackup(backup);
                if (!result.ok) {
                    setErrorText(result.error);
                    await refresh();
                    return;
                }
                // Success — autoLogin set $user, RootNavigator will swap to
                // the App stack on its next render. Persist the userID for
                // the picker the next time the user signs out — but only
                // when the backup actually carried one. Legacy text-format
                // backups don't have a userID; the App.tsx `$user`
                // subscription will backfill it on this very session.
                if (backup.userID.length > 0) {
                    await setUserIDForUsername(backup.username, backup.userID);
                }
            } catch (err: unknown) {
                setErrorText(
                    err instanceof Error
                        ? err.message
                        : "Restore failed unexpectedly.",
                );
                await refresh();
            } finally {
                setSigningInUsername(null);
            }
        },
        [accounts, refresh],
    );

    const handleRestoreFromFile = useCallback(async () => {
        if (signingInUsername !== null) {
            return;
        }
        haptic("tap");
        setErrorText(null);
        const parsed = await pickIdentityBackup();
        if (!parsed.ok) {
            if ("canceled" in parsed && parsed.canceled) {
                return;
            }
            if ("error" in parsed) {
                setErrorText(parsed.error);
            }
            return;
        }
        await applyParsedBackup(parsed.backup);
    }, [applyParsedBackup, signingInUsername]);

    const handleRestoreFromClipboard = useCallback(async () => {
        if (signingInUsername !== null) {
            return;
        }
        haptic("tap");
        setErrorText(null);
        let raw = "";
        try {
            raw = await Clipboard.getStringAsync();
        } catch (err: unknown) {
            setErrorText(
                err instanceof Error
                    ? `Could not read the clipboard: ${err.message}`
                    : "Could not read the clipboard.",
            );
            return;
        }
        if (raw.trim().length === 0) {
            setErrorText(
                "The clipboard is empty. Copy your backup text first, then try again.",
            );
            return;
        }
        const parsed = parseIdentityBackup(raw);
        if (!parsed.ok) {
            if ("canceled" in parsed && parsed.canceled) {
                return;
            }
            if ("error" in parsed) {
                setErrorText(parsed.error);
            }
            return;
        }
        await applyParsedBackup(parsed.backup);
    }, [applyParsedBackup, signingInUsername]);

    const handleRestore = useCallback(() => {
        if (signingInUsername !== null) {
            return;
        }
        haptic("tap");
        Alert.alert(
            "Restore from backup",
            "Pick a Vex identity backup file, or paste the text from a backup you saved earlier.",
            [
                { style: "cancel", text: "Cancel" },
                {
                    onPress: () => {
                        void handleRestoreFromClipboard();
                    },
                    text: "Paste from clipboard",
                },
                {
                    onPress: () => {
                        void handleRestoreFromFile();
                    },
                    text: "Pick a file",
                },
            ],
        );
    }, [handleRestoreFromClipboard, handleRestoreFromFile, signingInUsername]);

    if (!hydrated) {
        return (
            <ScreenLayout>
                <View style={styles.empty} />
            </ScreenLayout>
        );
    }

    if (accounts.length === 0) {
        // No saved accounts — first-run, or user removed every account.
        // Offer both the new-account path AND restore-from-backup so users
        // who lost their device can get back in without going through a
        // device-approval cycle.
        return (
            <ScreenLayout style={styles.layout}>
                <View style={styles.container}>
                    <View style={styles.brand}>
                        <VexLogo size={36} />
                        <Text style={styles.heading}>Welcome to Vex</Text>
                        <Text style={styles.subtitle}>
                            No accounts on this device yet.
                        </Text>
                    </View>
                    {errorText ? (
                        <View style={styles.errorBox}>
                            <Text style={styles.errorText}>{errorText}</Text>
                        </View>
                    ) : null}
                    <VexButton
                        disabled={signingInUsername !== null}
                        glow
                        onPress={handleAddAccount}
                        style={styles.addButton}
                        title="Get started"
                        variant="primary"
                    />
                    <VexButton
                        disabled={signingInUsername !== null}
                        onPress={handleRestore}
                        style={styles.addButton}
                        title="Restore from backup"
                        variant="outline"
                    />
                </View>
            </ScreenLayout>
        );
    }

    return (
        <ScreenLayout style={styles.layout}>
            <View style={styles.brand}>
                <VexLogo size={28} />
                <Text style={styles.heading}>Choose account</Text>
                <Text style={styles.subtitle}>
                    Tap to sign in. Long-press to remove.
                </Text>
            </View>

            {errorText ? (
                <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{errorText}</Text>
                </View>
            ) : null}

            <ScrollView
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                style={styles.list}
            >
                {accounts.map((account) => (
                    <AccountRow
                        account={account}
                        busy={signingInUsername === account.username}
                        disabled={
                            signingInUsername !== null &&
                            signingInUsername !== account.username
                        }
                        key={account.username}
                        onLongPress={() => {
                            handleRemove(account);
                        }}
                        onPress={() => {
                            void handleSelect(account);
                        }}
                    />
                ))}
            </ScrollView>

            <View style={styles.footer}>
                <VexButton
                    disabled={signingInUsername !== null}
                    onPress={handleAddAccount}
                    style={styles.addButton}
                    title="Add another account"
                    variant="outline"
                />
                <VexButton
                    disabled={signingInUsername !== null}
                    onPress={handleRestore}
                    style={styles.addButton}
                    title="Restore from backup"
                    variant="outline"
                />
            </View>
        </ScreenLayout>
    );
}

function AccountRow({
    account,
    busy,
    disabled,
    onLongPress,
    onPress,
}: AccountRowProps) {
    const userID = account.userID;
    return (
        <Pressable
            android_ripple={{ color: "rgba(231, 0, 0, 0.08)" }}
            delayLongPress={400}
            disabled={disabled}
            onLongPress={onLongPress}
            onPress={onPress}
            style={({ pressed }) => [
                styles.rowPressable,
                pressed && styles.rowPressed,
                disabled && styles.rowDisabled,
            ]}
        >
            <CornerBracketBox
                color={busy ? colors.accent : colors.border}
                size={10}
            >
                <View style={styles.row}>
                    {userID ? (
                        <Avatar
                            displayName={account.username}
                            ring={{
                                color: busy ? colors.accent : colors.accentDark,
                                width: busy ? 2 : 1,
                            }}
                            size={56}
                            userID={userID}
                        />
                    ) : (
                        <View style={styles.fallbackAvatar}>
                            <Text style={styles.fallbackInitial}>
                                {account.username.charAt(0).toUpperCase()}
                            </Text>
                        </View>
                    )}
                    <View style={styles.rowText}>
                        <Text numberOfLines={1} style={styles.handle}>
                            @{account.username}
                        </Text>
                        <Text numberOfLines={1} style={styles.deviceLine}>
                            {busy
                                ? "Signing in…"
                                : `device · ${shortDeviceID(account.deviceID)}`}
                        </Text>
                    </View>
                </View>
            </CornerBracketBox>
        </Pressable>
    );
}

/**
 * Drive a libvex login attempt against the cluster using credentials parsed
 * from a backup file, *without* writing the backup creds to the real
 * keychain until the cluster confirms they're still valid.
 *
 * Why a transient KeyStore? `vexService.autoLogin()` reads creds from
 * whatever KeyStore it's handed and persists tokens back to it on success.
 * Using a one-shot in-memory store lets us validate against the server and
 * only commit to the real `keychainKeyStore` after the server has accepted
 * the device. If validation fails — most importantly when the user has
 * removed this device from their account on a different phone (server
 * returns 401) — the real keychain stays untouched: we leave no trace of
 * the failed restore.
 *
 * Why `autoLogin` and not `login`? `autoLogin` has an at-rest decrypt-
 * mismatch recovery path that purges stale key material when the backup's
 * deviceKey doesn't match what was previously used to encrypt the SQLite
 * DB for this username on this device. `login` does not, and would throw
 * mid-validation in the "restoring on top of an existing slot with a
 * different deviceKey" scenario.
 */
async function restoreFromBackup(
    backup: IdentityBackup,
): Promise<{ error: string; ok: false } | { ok: true }> {
    const transient: TransientSlot = {
        creds: {
            deviceID: backup.deviceID,
            deviceKey: backup.deviceKey,
            token: "",
            username: backup.username,
        },
    };
    const transientStore: KeyStore = {
        async clear(_username: string): Promise<void> {
            transient.creds = null;
        },
        async load(username?: string): Promise<null | StoredCredentials> {
            if (transient.creds === null) return null;
            if (username && username !== transient.creds.username) return null;
            return transient.creds;
        },
        async save(c: StoredCredentials): Promise<void> {
            transient.creds = c;
        },
    };

    await hydrateLocalMessageRetention();
    const result = await vexService.autoLogin(
        transientStore,
        mobileConfig(),
        getServerOptions(),
    );
    if (!result.ok) {
        const reason = result.error ?? "Could not verify the backup.";
        // Heuristic for the "the cluster has revoked this device" case —
        // surface it verbatim plus an explainer, since the most common
        // cause is "I removed this device from my account from another
        // phone, then tried to restore." A revoked device cannot be
        // recovered just by importing the backup; the user has to enroll
        // fresh through device approval.
        const looksRevoked = /unauthor|revok|expired|not found|invalid/i.test(
            reason,
        );
        return {
            error: looksRevoked
                ? `${reason} The device may have been removed from this account from another device — restore is not possible until you re-enroll through device approval.`
                : reason,
            ok: false,
        };
    }

    // Validation passed — persist to the real keychain. This sets the slot
    // and updates the active-user pointer so the next launch auto-logs in
    // as this account.
    await keychainKeyStore.save({
        deviceID: backup.deviceID,
        deviceKey: backup.deviceKey,
        token: "",
        username: backup.username,
    });
    return { ok: true };
}

/**
 * Normalize a server URL/host pair so we can compare a backup's recorded
 * server against the currently configured one without protocol or trailing-
 * slash skew. Mirrors the sanitize logic in `keychain.ts` so both halves of
 * the system agree on what counts as "the same cluster".
 */
function sanitizeHost(host: string): string {
    return host
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
        .toLowerCase();
}

function shortDeviceID(deviceID: string): string {
    if (deviceID.length <= 12) return deviceID;
    return `${deviceID.slice(0, 6)}…${deviceID.slice(-4)}`;
}

const styles = StyleSheet.create({
    addButton: {
        width: "100%",
    },
    brand: {
        alignItems: "center",
        gap: 10,
        marginTop: 12,
        paddingTop: 24,
    },
    container: {
        alignItems: "center",
        flex: 1,
        gap: 24,
        justifyContent: "center",
    },
    deviceLine: {
        ...typography.body,
        color: colors.muted,
        fontSize: 12,
        marginTop: 2,
    },
    empty: { flex: 1 },
    errorBox: {
        backgroundColor: "rgba(229, 57, 53, 0.15)",
        borderColor: colors.error,
        borderWidth: 1,
        marginHorizontal: 8,
        marginTop: 16,
        padding: 10,
    },
    errorText: {
        ...typography.body,
        color: colors.error,
    },
    fallbackAvatar: {
        alignItems: "center",
        backgroundColor: colors.accentDark,
        borderColor: colors.accent,
        borderRadius: 28,
        borderWidth: 1,
        height: 56,
        justifyContent: "center",
        width: 56,
    },
    fallbackInitial: {
        ...typography.headingSmall,
        color: colors.text,
        fontSize: 22,
    },
    footer: {
        alignItems: "center",
        gap: 12,
        paddingBottom: 16,
        paddingTop: 8,
    },
    handle: {
        ...typography.button,
        color: colors.text,
        fontSize: 17,
    },
    heading: {
        ...typography.heading,
        color: colors.text,
        fontSize: 22,
        textAlign: "center",
    },
    layout: {
        backgroundColor: colors.bg,
    },
    list: {
        flex: 1,
    },
    listContent: {
        gap: 12,
        paddingBottom: 24,
        paddingTop: 24,
    },
    row: {
        alignItems: "center",
        backgroundColor: colors.surface,
        flexDirection: "row",
        gap: 16,
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    rowDisabled: {
        opacity: 0.4,
    },
    rowPressable: {},
    rowPressed: {
        opacity: 0.7,
    },
    rowText: {
        flex: 1,
    },
    subtitle: {
        ...typography.body,
        color: colors.muted,
        textAlign: "center",
    },
});
