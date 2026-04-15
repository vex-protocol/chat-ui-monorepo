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

import { getServerUrl } from "./config";

export function mobileConfig(): BootstrapConfig {
    return {
        async createStorage(
            _dbName: string,
            privateKey: string,
        ): Promise<Storage> {
            const { Kysely } = await import("kysely");
            const { ExpoDialect } = await import("kysely-expo");
            const { SqliteStorage } =
                await import("@vex-chat/libvex/storage/sqlite");

            const dbName = scopedDbName();
            const db = new Kysely({
                dialect: new ExpoDialect({ database: dbName }),
            });
            const storage = new SqliteStorage(db, privateKey);
            await storage.init();
            return storage;
        },
        deviceName: Platform.OS,
    };
}

function scopedDbName(): string {
    const host = getServerUrl()
        .replace(/^https?:\/\//, "")
        .replace(/\/+$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "-");
    return `vex-client.${host}.db`;
}
