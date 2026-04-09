/**
 * Mobile (Expo / React Native) platform configuration.
 *
 * Constructs a BootstrapConfig for the Vex store using:
 * - WebSocket: native global (React Native provides global WebSocket)
 * - Storage:   createExpoStorage (Kysely + kysely-expo + expo-sqlite)
 * - Logger:    console wrapper with [vex] prefix
 * - deviceName: Platform.OS
 */
import type { Logger, Storage } from "@vex-chat/libvex";
import type { BootstrapConfig } from "@vex-chat/store";

import { Platform } from "react-native";

const logger: Logger = {
    debug(m) {
        console.debug(`[vex] ${m}`);
    },
    error(m) {
        console.error(`[vex] ${m}`);
    },
    info(m) {
        console.log(`[vex] ${m}`);
    },
    warn(m) {
        console.warn(`[vex] ${m}`);
    },
};

export function mobileConfig(): BootstrapConfig {
    return {
        async createStorage(dbName, privateKey, _logger): Promise<Storage> {
            const mod = (await import("@vex-chat/libvex/storage/expo")) as {
                createExpoStorage: (
                    db: string,
                    pk: string,
                    l: Logger,
                ) => Storage;
            };
            return mod.createExpoStorage(dbName, privateKey, _logger);
        },
        deviceName: Platform.OS,
        logger,
    };
}
