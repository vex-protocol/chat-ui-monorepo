import type { KeyStore, StoredCredentials } from "@vex-chat/libvex";

import * as SecureStore from "expo-secure-store";

import { getServerUrl } from "./config";

const CREDS_KEY_PREFIX = "vex-device-credentials";
const ACTIVE_USER_KEY_PREFIX = "vex-active-user";

export async function clearCredentials(username?: string): Promise<void> {
    const user = username ?? (await loadActiveUsername());
    if (!user) {
        await SecureStore.deleteItemAsync(activeUserKey());
        await SecureStore.deleteItemAsync(legacyCredsKey());
        return;
    }
    await SecureStore.deleteItemAsync(credsKeyForUser(user));
    const active = await loadActiveUsername();
    if (active === user) {
        await SecureStore.deleteItemAsync(activeUserKey());
    }
    const legacy = await readLegacyCredentials();
    if (legacy?.username === user) {
        await SecureStore.deleteItemAsync(legacyCredsKey());
    }
}

export async function loadCredentials(
    username?: string,
): Promise<null | StoredCredentials> {
    const user = username ?? (await loadActiveUsername());
    if (user) {
        const raw = await SecureStore.getItemAsync(credsKeyForUser(user));
        if (raw) {
            return JSON.parse(raw) as StoredCredentials;
        }
    }
    // Legacy fallback: older builds used a single host-scoped slot.
    const legacy = await readLegacyCredentials();
    if (!legacy) {
        return null;
    }
    if (user && legacy.username !== user) {
        return null;
    }
    await saveCredentials(legacy);
    return legacy;
}

export async function saveCredentials(creds: StoredCredentials): Promise<void> {
    await SecureStore.setItemAsync(
        credsKeyForUser(creds.username),
        JSON.stringify(creds),
    );
    await SecureStore.setItemAsync(activeUserKey(), creds.username);
    await SecureStore.deleteItemAsync(legacyCredsKey());
}

function activeUserKey(): string {
    return `${ACTIVE_USER_KEY_PREFIX}.${scopeFromHost(getServerUrl())}`;
}

function credsKeyForUser(username: string): string {
    return `${CREDS_KEY_PREFIX}.${scopeFromHost(getServerUrl())}.${scopeFromHost(
        username,
    )}`;
}

function legacyCredsKey(): string {
    return `${CREDS_KEY_PREFIX}.${scopeFromHost(getServerUrl())}`;
}

async function loadActiveUsername(): Promise<null | string> {
    const raw = await SecureStore.getItemAsync(activeUserKey());
    if (!raw) return null;
    return raw;
}

async function readLegacyCredentials(): Promise<null | StoredCredentials> {
    const raw = await SecureStore.getItemAsync(legacyCredsKey());
    if (!raw) {
        return null;
    }
    try {
        return JSON.parse(raw) as StoredCredentials;
    } catch {
        return null;
    }
}

/**
 * Sanitize a host string into a stable identifier for scoping the
 * SecureStore key. expo-secure-store only allows [A-Za-z0-9._-]; strip
 * protocol and replace everything else with dashes.
 */
function scopeFromHost(host: string): string {
    return host
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-");
}

/**
 * KeyStore adapter for expo-secure-store.
 * Uses iOS Keychain / Android Keystore under the hood.
 * Credentials are scoped by server host so switching between
 * prod/staging/local uses isolated slots.
 */
export const keychainKeyStore: KeyStore = {
    async clear(username: string): Promise<void> {
        await clearCredentials(username);
    },
    async load(username?: string): Promise<null | StoredCredentials> {
        return loadCredentials(username);
    },
    async save(creds: StoredCredentials): Promise<void> {
        await saveCredentials(creds);
    },
};
