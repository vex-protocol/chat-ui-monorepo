/**
 * Mobile (Expo / React Native) platform configuration.
 *
 * Constructs a BootstrapConfig for the Vex store using:
 * - WebSocket: BrowserWebSocket (React Native's global WebSocket)
 * - Storage:   createExpoStorage (Kysely + kysely-expo + expo-sqlite)
 * - Logger:    console wrapper with [vex] prefix
 * - deviceName: Platform.OS
 */
import type { ILogger } from "@vex-chat/libvex";
import type { BootstrapConfig } from "@vex-chat/store";

import { Platform } from "react-native";

import { BrowserWebSocket } from "@vex-chat/libvex/transport/browser";

const logger: ILogger = {
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
        adapters: {
            logger,
            WebSocket: BrowserWebSocket,
        },
        async createStorage(dbName, privateKey, _logger) {
            const { createExpoStorage } =
                await import("@vex-chat/libvex/storage/expo");
            return createExpoStorage(dbName, privateKey, _logger ?? logger);
        },
        deviceName: Platform.OS,
    };
}
