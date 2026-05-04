import { atom, readonlyType } from "nanostores";

/** Must stay aligned with {@link MAX_LOCAL_MESSAGE_RETENTION_DAYS} in `@vex-chat/libvex`. */
export const MAX_LOCAL_MESSAGE_RETENTION_DAYS = 30;

/**
 * Clamps a user preference to 1…{@link MAX_LOCAL_MESSAGE_RETENTION_DAYS}.
 * Duplicated here so the store package type-checks against the published
 * `@vex-chat/libvex` catalog version until it ships these APIs.
 */
export function clampLocalMessageRetentionDays(
    days: null | number | undefined,
): number {
    if (days === null || days === undefined) {
        return MAX_LOCAL_MESSAGE_RETENTION_DAYS;
    }
    const n = Math.round(days);
    if (!Number.isFinite(n)) {
        return MAX_LOCAL_MESSAGE_RETENTION_DAYS;
    }
    return Math.min(MAX_LOCAL_MESSAGE_RETENTION_DAYS, Math.max(1, n));
}

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
