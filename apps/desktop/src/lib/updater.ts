import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

export interface UpdateStatus {
    available: boolean;
    version?: string;
    downloading: boolean;
    progress: number;
    readyToInstall: boolean;
    error?: string;
}

type StatusCallback = (status: UpdateStatus) => void;

const initial: UpdateStatus = {
    available: false,
    downloading: false,
    progress: 0,
    readyToInstall: false,
};

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
            version: update.version,
            downloading: false,
            progress: 0,
            readyToInstall: false,
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
                    version: update.version,
                    downloading: true,
                    progress,
                    readyToInstall: false,
                });
            } else if (event.event === "Finished") {
                onStatus({
                    available: true,
                    version: update.version,
                    downloading: false,
                    progress: 1,
                    readyToInstall: true,
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

/** Relaunches the app after an update has been installed. */
export async function applyUpdate(): Promise<void> {
    await relaunch();
}
