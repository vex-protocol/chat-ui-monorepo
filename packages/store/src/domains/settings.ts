import { atom, readonlyType } from "nanostores";

import {
    clampLocalMessageRetentionDays,
    MAX_LOCAL_MESSAGE_RETENTION_DAYS,
} from "../local-message-retention.ts";

/** Writable — hydrated from platform storage before `Client.create`. */
export const $localMessageRetentionDaysWritable = atom<number>(
    MAX_LOCAL_MESSAGE_RETENTION_DAYS,
);

export const $localMessageRetentionDays = readonlyType(
    $localMessageRetentionDaysWritable,
);

export function setLocalMessageRetentionDaysPreference(days: number): void {
    $localMessageRetentionDaysWritable.set(
        clampLocalMessageRetentionDays(days),
    );
}
