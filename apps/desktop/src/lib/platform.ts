/**
 * Desktop (Tauri) platform configuration.
 *
 * Constructs a BootstrapConfig for the Vex store using:
 * - Storage:   Kysely + kysely-dialect-tauri + @tauri-apps/plugin-sql
 * - Logger:    console wrapper with [vex] prefix
 * - deviceName: navigator.platform
 */
import type { Logger, Storage } from "@vex-chat/libvex";
import type { BootstrapConfig } from "@vex-chat/store";

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

export function desktopConfig(): BootstrapConfig {
    return {
        async createStorage(
            dbName: string,
            privateKey: string,
            storageLogger: Logger,
        ): Promise<Storage> {
            const { Kysely } = await import("kysely");
            const { TauriSqliteDialect } = await import("kysely-dialect-tauri");
            const { default: Database } =
                await import("@tauri-apps/plugin-sql");
            const { SqliteStorage } =
                await import("@vex-chat/libvex/storage/sqlite");

            const db = new Kysely({
                dialect: new TauriSqliteDialect({
                    database: () => Database.load(`sqlite:${dbName}`),
                }),
            });
            // ClientDatabase type lives behind libvex's internal schema
            // module and isn't re-exported from the sqlite subpath; cast
            // via `never` to satisfy the Kysely<ClientDatabase> parameter
            // without pulling in an internal import.
            const storage = new SqliteStorage(
                db as never,
                privateKey,
                storageLogger,
            );
            await storage.init();
            console.log(
                "[platform] Storage initialized, testing savePreKeys...",
            );
            return storage;
        },
        // navigator.platform is formally deprecated but the modern
        // replacement (navigator.userAgentData.platform) is Chromium-
        // only and missing on Safari/WebKit and all iOS browsers.
        // Tauri's WebView is OS-specific so coverage gaps are real.
        // Keeping .platform until there's a universally supported
        // alternative — the value is purely informational for the
        // device name surface.
        // eslint-disable-next-line @typescript-eslint/no-deprecated
        deviceName: navigator.platform,
        logger,
    };
}
