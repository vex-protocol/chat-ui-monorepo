/**
 * Desktop (Tauri) platform configuration.
 *
 * Constructs a BootstrapConfig for the Vex store using:
 * - WebSocket: native global (Tauri webview has browser-native WS)
 * - Storage:   createTauriStorage (Kysely + kysely-dialect-tauri + @tauri-apps/plugin-sql)
 * - Logger:    console wrapper with [vex] prefix
 * - deviceName: navigator.platform
 */
import type { Logger, Storage } from "@vex-chat/libvex";
import type { BootstrapConfig } from "@vex-chat/store";

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

export function desktopConfig(): BootstrapConfig {
    return {
        async createStorage(dbName, privateKey, _logger): Promise<Storage> {
            const mod = (await import("@vex-chat/libvex/storage/tauri")) as {
                createTauriStorage: (
                    db: string,
                    pk: string,
                    l: Logger,
                ) => Storage;
            };
            return mod.createTauriStorage(dbName, privateKey, _logger);
        },
        deviceName: navigator.platform,
        logger,
    };
}
