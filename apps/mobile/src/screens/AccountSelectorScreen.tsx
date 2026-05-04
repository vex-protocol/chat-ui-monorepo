import type { AuthScreenProps } from "../navigation/types";

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

import { Avatar } from "../components/Avatar";
import { CornerBracketBox } from "../components/CornerBracketBox";
import { ScreenLayout } from "../components/ScreenLayout";
import { VexButton } from "../components/VexButton";
import { VexLogo } from "../components/VexLogo";
import { getServerOptions } from "../lib/config";
import { haptic } from "../lib/haptics";
import {
    clearCredentials,
    keychainKeyStore,
    type KnownAccount,
    listKnownAccounts,
    setActiveUsername,
} from "../lib/keychain";
import { mobileConfig } from "../lib/platform";
import { colors, typography } from "../theme";

interface AccountRowProps {
    account: KnownAccount;
    busy: boolean;
    disabled: boolean;
    onLongPress: () => void;
    onPress: () => void;
}

type Props = AuthScreenProps<"AccountSelector">;

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

    if (!hydrated) {
        return (
            <ScreenLayout>
                <View style={styles.empty} />
            </ScreenLayout>
        );
    }

    if (accounts.length === 0) {
        // No saved accounts — bounce to the welcome flow. This handles the
        // first-run case as well as a user who removed every account.
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
                    <VexButton
                        glow
                        onPress={handleAddAccount}
                        style={styles.addButton}
                        title="Get started"
                        variant="primary"
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
