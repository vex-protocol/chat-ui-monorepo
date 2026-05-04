import {
    clampLocalMessageRetentionDays as clampLocalMessageRetentionDaysImpl,
    MAX_LOCAL_MESSAGE_RETENTION_DAYS as maxLocalMessageRetentionDaysImpl,
} from "@vex-chat/libvex";

/** Wrapped SDK retention helpers — apps import these from `@vex-chat/store`. */
export function clampLocalMessageRetentionDays(
    days: null | number | undefined,
): number {
    return clampLocalMessageRetentionDaysImpl(days);
}

export const MAX_LOCAL_MESSAGE_RETENTION_DAYS =
    maxLocalMessageRetentionDaysImpl;
