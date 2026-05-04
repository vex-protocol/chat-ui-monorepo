import type { IdentityBackup } from "./identityBackup";
import type { KeyStore, StoredCredentials } from "@vex-chat/libvex";

import { vexService } from "@vex-chat/store";

import { getServerOptions } from "./config";
import { keychainKeyStore } from "./keychain";
import { mobileConfig } from "./platform";
import { hydrateLocalMessageRetention } from "./retentionPreference";

interface TransientSlot {
    creds: null | StoredCredentials;
}

/**
 * Drive a libvex login attempt against the cluster using credentials parsed
 * from a backup file, *without* writing the backup creds to the real
 * keychain until the cluster confirms they're still valid.
 *
 * Uses a transient in-memory `KeyStore` so `vexService.autoLogin()` can
 * validate first; only `keychainKeyStore.save` runs after success (401 etc.
 * leaves the real keychain untouched). `autoLogin` (not `login`) is required
 * for decrypt-mismatch recovery when the backup deviceKey differs from the
 * one that encrypted an existing local DB for this username.
 */
export async function restoreIdentityKeyBackup(
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
 * slash skew. Mirrors the sanitize logic in `keychain.ts`.
 */
export function sanitizeHostForBackup(host: string): string {
    return host
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
        .toLowerCase();
}
