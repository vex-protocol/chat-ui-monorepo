import {
    clampLocalMessageRetentionDays,
    MAX_LOCAL_MESSAGE_RETENTION_DAYS,
    setLocalMessageRetentionDaysPreference,
} from "@vex-chat/store";

import * as SecureStore from "expo-secure-store";

const STORE_KEY = "vex_local_message_retention_days_v1";

export async function hydrateLocalMessageRetention(): Promise<void> {
    try {
        const raw = await SecureStore.getItemAsync(STORE_KEY);
        if (raw === null || raw.trim() === "") {
            setLocalMessageRetentionDaysPreference(
                MAX_LOCAL_MESSAGE_RETENTION_DAYS,
            );
            return;
        }
        const n = Number(raw);
        setLocalMessageRetentionDaysPreference(
            clampLocalMessageRetentionDays(Number.isFinite(n) ? n : undefined),
        );
    } catch {
        setLocalMessageRetentionDaysPreference(
            MAX_LOCAL_MESSAGE_RETENTION_DAYS,
        );
    }
}

export async function persistLocalMessageRetentionDays(
    days: number,
): Promise<void> {
    const clamped = clampLocalMessageRetentionDays(days);
    try {
        await SecureStore.setItemAsync(STORE_KEY, String(clamped));
    } catch {
        /* non-fatal */
    }
}
