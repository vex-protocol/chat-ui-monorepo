import type { KeyStore, StoredCredentials } from "@vex-chat/libvex";

const SERVICE = "com.vex-chat.desktop";
const ACTIVE_USER_LS_KEY = "vex-active-user";

/**
 * KeyStore backed by OS native credential stores via tauri-plugin-keyring.
 *
 * macOS: Keychain Services
 * Windows: Credential Manager
 * Linux: Secret Service (GNOME Keyring / KWallet)
 *
 * Only the actual credentials blob (private key, tokens) hits the keychain.
 * The active-user pointer (just a username string, non-sensitive) lives in
 * localStorage to avoid an extra keychain prompt per session.
 */
class KeyringKeyStore implements KeyStore {
    private credsCache = new Map<string, StoredCredentials>();
    private keyring: null | typeof import("tauri-plugin-keyring-api") = null;

    async clear(username: string): Promise<void> {
        const kr = await this.getKeyring();
        this.credsCache.delete(username);
        try {
            await kr.deletePassword(SERVICE, username);
        } catch {
            /* may not exist */
        }
        if (this.getActiveUser() === username) {
            localStorage.removeItem(ACTIVE_USER_LS_KEY);
        }
    }

    async load(username?: string): Promise<null | StoredCredentials> {
        const user = username ?? this.getActiveUser();
        if (!user) return null;

        const cached = this.credsCache.get(user);
        if (cached) return cached;

        const kr = await this.getKeyring();
        const raw = await kr.getPassword(SERVICE, user);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as StoredCredentials;
            this.credsCache.set(user, parsed);
            return parsed;
        } catch {
            return null;
        }
    }

    async loadActive(): Promise<null | StoredCredentials> {
        return this.load();
    }

    async save(creds: StoredCredentials): Promise<void> {
        const existing = this.credsCache.get(creds.username);
        const serialized = JSON.stringify(creds);

        if (existing && JSON.stringify(existing) === serialized) {
            if (this.getActiveUser() !== creds.username) {
                localStorage.setItem(ACTIVE_USER_LS_KEY, creds.username);
            }
            return;
        }

        this.credsCache.set(creds.username, creds);
        localStorage.setItem(ACTIVE_USER_LS_KEY, creds.username);

        const kr = await this.getKeyring();
        await kr.setPassword(SERVICE, creds.username, serialized);
    }

    private getActiveUser(): null | string {
        return localStorage.getItem(ACTIVE_USER_LS_KEY);
    }

    private async getKeyring() {
        if (!this.keyring) {
            this.keyring = await import("tauri-plugin-keyring-api");
        }
        return this.keyring;
    }
}

// ── localStorage fallback (dev mode without Tauri runtime) ──────────────────

const LS_PREFIX = "vex-ks-";
const LS_ACTIVE = "vex-active-user";

class LocalStorageKeyStore implements KeyStore {
    clear(username: string): Promise<void> {
        localStorage.removeItem(LS_PREFIX + username);
        if (localStorage.getItem(LS_ACTIVE) === username) {
            localStorage.removeItem(LS_ACTIVE);
        }
        return Promise.resolve();
    }

    load(username?: string): Promise<null | StoredCredentials> {
        const user = username ?? localStorage.getItem(LS_ACTIVE);
        if (!user) return Promise.resolve(null);
        const raw = localStorage.getItem(LS_PREFIX + user);
        if (!raw) return Promise.resolve(null);
        try {
            return Promise.resolve(JSON.parse(raw) as StoredCredentials);
        } catch {
            return Promise.resolve(null);
        }
    }

    loadActive(): Promise<null | StoredCredentials> {
        return this.load();
    }

    save(creds: StoredCredentials): Promise<void> {
        localStorage.setItem(LS_PREFIX + creds.username, JSON.stringify(creds));
        localStorage.setItem(LS_ACTIVE, creds.username);
        return Promise.resolve();
    }
}

// ── Export ───────────────────────────────────────────────────────────────────

/** Uses OS keychain via tauri-plugin-keyring in Tauri, falls back to localStorage in dev browser. */
export const keyStore: KeyStore & {
    loadActive(): Promise<null | StoredCredentials>;
} =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
        ? new KeyringKeyStore()
        : new LocalStorageKeyStore();
