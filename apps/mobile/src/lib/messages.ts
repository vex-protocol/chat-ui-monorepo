import type { IMessage as Message } from "@vex-chat/libvex";

/**
 * Local message persistence for React Native using AsyncStorage.
 *
 * Privacy model: spire deletes messages after the client sends a receipt,
 * so we must save locally before receipting. This module stores messages
 * keyed by thread (channelID for groups, userID for DMs).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const GROUP_KEY = "vex:groupMessages";
const DM_KEY = "vex:dmMessages";
const FAMILIARS_KEY = "vex:familiars";

export async function clearMessages(): Promise<void> {
    await Promise.all([
        AsyncStorage.removeItem(GROUP_KEY),
        AsyncStorage.removeItem(DM_KEY),
    ]);
}

export async function loadFamiliars(): Promise<Record<string, User>> {
    const raw = await AsyncStorage.getItem(FAMILIARS_KEY);
    return raw ? JSON.parse(raw) : {};
}

export async function loadMessages(): Promise<{
    dms: Record<string, Message[]>;
    groups: Record<string, Message[]>;
}> {
    const [groupsRaw, dmsRaw] = await Promise.all([
        AsyncStorage.getItem(GROUP_KEY),
        AsyncStorage.getItem(DM_KEY),
    ]);
    return {
        dms: dmsRaw ? JSON.parse(dmsRaw) : {},
        groups: groupsRaw ? JSON.parse(groupsRaw) : {},
    };
}

export async function saveDmMessages(
    dms: Record<string, Message[]>,
): Promise<void> {
    await AsyncStorage.setItem(DM_KEY, JSON.stringify(dms));
}

// ── Familiars persistence ─────────────────────────────────────────────────────

import type { IUser as User } from "@vex-chat/libvex";

export async function saveFamiliars(
    familiars: Record<string, User>,
): Promise<void> {
    await AsyncStorage.setItem(FAMILIARS_KEY, JSON.stringify(familiars));
}

export async function saveGroupMessages(
    groups: Record<string, Message[]>,
): Promise<void> {
    await AsyncStorage.setItem(GROUP_KEY, JSON.stringify(groups));
}
