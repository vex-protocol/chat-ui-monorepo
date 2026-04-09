/**
 * Mobile (Expo / React Native) platform configuration.
 *
 * Constructs a BootstrapConfig for the Vex store using:
 * - Storage:   Kysely + kysely-expo + expo-sqlite
 * - Logger:    console wrapper with [vex] prefix
 * - deviceName: Platform.OS
 */
import type { Logger, Storage } from "@vex-chat/libvex";
import type { BootstrapConfig } from "@vex-chat/store";

import { Platform } from "react-native";

const logger: Logger = {
    debug(m: string) {
        console.debug(`[vex] ${m}`);
    },
    error(m: string) {
        console.error(`[vex] ${m}`);
    },
    info(m: string) {
        console.log(`[vex] ${m}`);
    },
    warn(m: string) {
        console.warn(`[vex] ${m}`);
    },
};

export function mobileConfig(): BootstrapConfig {
    return {
        async createStorage(
            dbName: string,
            privateKey: string,
            storageLogger: Logger,
        ): Promise<Storage> {
            const { Kysely } = await import("kysely");
            const { ExpoDialect } = await import("kysely-expo");
            const { SqliteStorage } =
                await import("@vex-chat/libvex/storage/sqlite");

            const db = new Kysely({
                dialect: new ExpoDialect({ database: dbName }),
            });
            const storage = new SqliteStorage(db, privateKey, storageLogger);
            await storage.init();
            return storage;
        },
        deviceName: Platform.OS,
        logger,
    };
}
