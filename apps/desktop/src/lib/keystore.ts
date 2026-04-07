import type { KeyStore, StoredCredentials } from "@vex-chat/libvex";

const SERVICE = "com.vex-chat.desktop";
const ACTIVE_USER_KEY = "__vex_active_user__";

/**
 * KeyStore backed by OS native credential stores via tauri-plugin-keyring.
 *
 * macOS: Keychain Services
 * Windows: Credential Manager
 * Linux: Secret Service (GNOME Keyring / KWallet)
 *
 * Credentials are stored as JSON strings in the OS keychain, keyed by
 * service name + username. The active user is tracked separately.
 */
class KeyringKeyStore implements KeyStore {
    private keyring: typeof import("tauri-plugin-keyring-api") | null = null;

    private async getKeyring() {
        if (!this.keyring) {
            this.keyring = await import("tauri-plugin-keyring-api");
        }
        return this.keyring;
    }

    async load(username?: string): Promise<StoredCredentials | null> {
        const kr = await this.getKeyring();
        const user = username ?? (await this.getActiveUser(kr));
        if (!user) return null;
        const raw = await kr.getPassword(SERVICE, user);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as StoredCredentials;
        } catch {
            return null;
        }
    }

    async loadActive(): Promise<StoredCredentials | null> {
        return this.load();
    }

    async save(creds: StoredCredentials): Promise<void> {
        const kr = await this.getKeyring();
        await kr.setPassword(SERVICE, creds.username, JSON.stringify(creds));
        await kr.setPassword(SERVICE, ACTIVE_USER_KEY, creds.username);
    }

    async clear(username: string): Promise<void> {
        const kr = await this.getKeyring();
        try {
            await kr.deletePassword(SERVICE, username);
        } catch {
            /* may not exist */
        }
        const active = await this.getActiveUser(kr);
        if (active === username) {
            try {
                await kr.deletePassword(SERVICE, ACTIVE_USER_KEY);
            } catch {
                /* ok */
            }
        }
    }

    private async getActiveUser(
        kr: typeof import("tauri-plugin-keyring-api"),
    ): Promise<string | null> {
        try {
            return await kr.getPassword(SERVICE, ACTIVE_USER_KEY);
        } catch {
            return null;
        }
    }
}

// ── localStorage fallback (dev mode without Tauri runtime) ──────────────────

const LS_PREFIX = "vex-ks-";
const LS_ACTIVE = "vex-active-user";

class LocalStorageKeyStore implements KeyStore {
    async load(username?: string): Promise<StoredCredentials | null> {
        const user = username ?? localStorage.getItem(LS_ACTIVE);
        if (!user) return null;
        const raw = localStorage.getItem(LS_PREFIX + user);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as StoredCredentials;
        } catch {
            return null;
        }
    }

    async loadActive(): Promise<StoredCredentials | null> {
        return this.load();
    }

    async save(creds: StoredCredentials): Promise<void> {
        localStorage.setItem(LS_PREFIX + creds.username, JSON.stringify(creds));
        localStorage.setItem(LS_ACTIVE, creds.username);
    }

    async clear(username: string): Promise<void> {
        localStorage.removeItem(LS_PREFIX + username);
        if (localStorage.getItem(LS_ACTIVE) === username) {
            localStorage.removeItem(LS_ACTIVE);
        }
    }
}

// ── Export ───────────────────────────────────────────────────────────────────

/** Uses OS keychain via tauri-plugin-keyring in Tauri, falls back to localStorage in dev browser. */
export const keyStore: KeyStore & {
    loadActive(): Promise<StoredCredentials | null>;
} =
    typeof window !== "undefined" && "__TAURI_INTERNALS__" in window
        ? new KeyringKeyStore()
        : new LocalStorageKeyStore();
