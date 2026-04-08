import { relaunch } from "@tauri-apps/plugin-process";
import { check } from "@tauri-apps/plugin-updater";

export interface UpdateStatus {
    available: boolean;
    downloading: boolean;
    error?: string;
    progress: number;
    readyToInstall: boolean;
    version?: string;
}

type StatusCallback = (status: UpdateStatus) => void;

const initial: UpdateStatus = {
    available: false,
    downloading: false,
    progress: 0,
    readyToInstall: false,
};

/** Relaunches the app after an update has been installed. */
export async function applyUpdate(): Promise<void> {
    await relaunch();
}

/**
 * Checks for updates and manages the download lifecycle.
 * Calls `onStatus` with each state change for the UI to react.
 */
export async function checkForUpdates(onStatus: StatusCallback): Promise<void> {
    onStatus({ ...initial });

    try {
        const update = await check();
        if (!update) {
            onStatus({ ...initial });
            return;
        }

        onStatus({
            available: true,
            downloading: false,
            progress: 0,
            readyToInstall: false,
            version: update.version,
        });

        // Download the update
        let contentLength = 0;
        let downloaded = 0;

        await update.downloadAndInstall((event) => {
            if (event.event === "Started" && event.data.contentLength) {
                contentLength = event.data.contentLength;
            } else if (event.event === "Progress") {
                downloaded += event.data.chunkLength;
                const progress =
                    contentLength > 0 ? downloaded / contentLength : 0;
                onStatus({
                    available: true,
                    downloading: true,
                    progress,
                    readyToInstall: false,
                    version: update.version,
                });
            } else if (event.event === "Finished") {
                onStatus({
                    available: true,
                    downloading: false,
                    progress: 1,
                    readyToInstall: true,
                    version: update.version,
                });
            }
        });
    } catch (err) {
        onStatus({
            ...initial,
            error: err instanceof Error ? err.message : String(err),
        });
    }
}
