import * as SecureStore from "expo-secure-store";
import { atom } from "nanostores";

/**
 * Whether the user has unlocked the developer options surface via the
 * "tap version 7 times" easter egg in About. Persisted in SecureStore
 * so it survives app restarts but is automatically wiped if the user
 * clears app data.
 *
 * The atom seeds to `false`; call {@link hydrateDevOptionsUnlocked}
 * once at boot to pull the persisted value.
 */
export const $devOptionsUnlocked = atom<boolean>(false);

const STORE_KEY = "vex.devOptionsUnlocked.v1";

let hydrated = false;

export async function hydrateDevOptionsUnlocked(): Promise<void> {
    if (hydrated) {
        return;
    }
    hydrated = true;
    try {
        const raw = await SecureStore.getItemAsync(STORE_KEY);
        if (raw === "1") {
            $devOptionsUnlocked.set(true);
        }
    } catch {
        // SecureStore can throw on misconfigured devices; the surface
        // is non-essential, so we just keep the default (`false`).
    }
}

export async function setDevOptionsUnlocked(unlocked: boolean): Promise<void> {
    $devOptionsUnlocked.set(unlocked);
    try {
        if (unlocked) {
            await SecureStore.setItemAsync(STORE_KEY, "1");
        } else {
            await SecureStore.deleteItemAsync(STORE_KEY);
        }
    } catch {
        // Ignore — the in-memory atom is the source of truth for the
        // current session even if persistence fails.
    }
}
