import type { KeyStore, StoredCredentials } from "@vex-chat/libvex";

import * as SecureStore from "expo-secure-store";

const CREDS_KEY = "vex-device-credentials";

export async function clearCredentials(): Promise<void> {
    await SecureStore.deleteItemAsync(CREDS_KEY);
}

export async function loadCredentials(): Promise<null | StoredCredentials> {
    const raw = await SecureStore.getItemAsync(CREDS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredCredentials;
}

export async function saveCredentials(creds: StoredCredentials): Promise<void> {
    await SecureStore.setItemAsync(CREDS_KEY, JSON.stringify(creds));
}

/**
 * KeyStore adapter for expo-secure-store.
 * Uses iOS Keychain / Android Keystore under the hood.
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
