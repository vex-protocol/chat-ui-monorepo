/**
 * Desktop (Tauri) platform configuration.
 *
 * Constructs a BootstrapConfig for the Vex store using:
 * - WebSocket: BrowserWebSocket (Tauri webview uses browser-native WS)
 * - Storage:   createTauriStorage (Kysely + kysely-dialect-tauri + @tauri-apps/plugin-sql)
 * - Logger:    console wrapper with [vex] prefix
 * - deviceName: navigator.platform
 */
import type { ILogger } from "@vex-chat/libvex";
import type { BootstrapConfig } from "@vex-chat/store";

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

export function desktopConfig(): BootstrapConfig {
    return {
        adapters: {
            logger,
            WebSocket: BrowserWebSocket,
        },
        async createStorage(dbName, privateKey, _logger) {
            const { createTauriStorage } =
                await import("@vex-chat/libvex/storage/tauri");
            return createTauriStorage(dbName, privateKey, _logger ?? logger);
        },
        deviceName: navigator.platform,
    };
}
