import type { KeyStore, StoredCredentials } from "@vex-chat/libvex";

import * as SecureStore from "expo-secure-store";

import { getServerUrl } from "./config.js";

const CREDS_KEY_PREFIX = "vex-device-credentials";

export async function clearCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(credsKey());
}

export async function loadCredentials(): Promise<null | StoredCredentials> {
    const raw = await SecureStore.getItemAsync(credsKey());
    if (!raw) return null;
    return JSON.parse(raw) as StoredCredentials;
}

export async function saveCredentials(creds: StoredCredentials): Promise<void> {
    await SecureStore.setItemAsync(credsKey(), JSON.stringify(creds));
}

function credsKey(): string {
    return `${CREDS_KEY_PREFIX}.${scopeFromHost(getServerUrl())}`;
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
    async clear(_username: string): Promise<void> {
        await clearCredentials();
    },
    async load(_username?: string): Promise<null | StoredCredentials> {
        return loadCredentials();
    },
    async save(creds: StoredCredentials): Promise<void> {
        await saveCredentials(creds);
    },
};
