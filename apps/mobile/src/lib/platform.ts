/**
 * Mobile (Expo / React Native) platform configuration.
 *
 * Constructs a BootstrapConfig for the Vex store using:
 * - Storage:   Kysely + kysely-expo + expo-sqlite
 * - deviceName: Platform.OS
 */
import type { Storage } from "@vex-chat/libvex";
import type { BootstrapConfig } from "@vex-chat/store";

import { Platform } from "react-native";

import * as SecureStore from "expo-secure-store";

import { getServerUrl } from "./config";

export function mobileConfig(): BootstrapConfig {
    return {
        async createStorage(
            privateKey: string,
            username: string,
        ): Promise<Storage> {
            const { Kysely } = await import("kysely");
            const { ExpoDialect } = await import("kysely-expo");
            const { SqliteStorage } =
                await import("@vex-chat/libvex/storage/sqlite");

            const dbName = scopedDbName(username);
            const db = new Kysely({
                dialect: new ExpoDialect({ database: dbName }),
            });
            const atRestAes = deriveAtRestAesKey(privateKey);
            const storage = new SqliteStorage(db, atRestAes);
            await storage.init();
            await applyLibvex6RatchetMigration(dbName, db, username);
            return storage;
        },
        deviceName: Platform.OS,
    };
}

async function applyLibvex6RatchetMigration(
    dbName: string,
    db: {
        deleteFrom: (table: string) => {
            execute: () => Promise<unknown>;
        };
    },
    username: string,
): Promise<void> {
    const key = libv6MigrationKey(username);
    const already = await SecureStore.getItemAsync(key);
    if (already === "1") {
        return;
    }
    // libvex 6 ratchet rollout: force fresh device sessions once per account/server.
    await db.deleteFrom("sessions").execute();
    await SecureStore.setItemAsync(key, "1");
    console.info("[vex-mobile] applied libvex6 session migration", {
        dbName,
        username,
    });
}

function decodeHex(hex: string): Uint8Array {
    const normalized = hex.trim().toLowerCase();
    const evenHex = normalized.length % 2 === 0 ? normalized : `0${normalized}`;
    const out = new Uint8Array(evenHex.length / 2);
    for (let i = 0; i < out.length; i += 1) {
        const start = i * 2;
        out[i] = Number.parseInt(evenHex.slice(start, start + 2), 16);
    }
    return out;
}

function deriveAtRestAesKey(privateKeyHex: string): Uint8Array {
    const raw = decodeHex(privateKeyHex);
    if (raw.length === 32) {
        return raw;
    }
    if (raw.length > 32) {
        return raw.subarray(0, 32);
    }
    const out = new Uint8Array(32);
    out.set(raw);
    return out;
}

function libv6MigrationKey(username: string): string {
    return `vex-libvex6-migrated.${sanitize(getServerUrl())}.${sanitize(username)}`;
}

function sanitize(s: string): string {
    return s
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-");
}

function scopedDbName(username: string): string {
    return `vex-client.${sanitize(getServerUrl())}.${sanitize(username)}.db`;
}
