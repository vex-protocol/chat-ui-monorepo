import type { IDevice } from "@vex-chat/libvex";

import { map } from "nanostores";

/**
 * Devices per user, keyed by ownerID (userID).
 * Populated during bootstrap for each familiar.
 */
export const $devices = map<Record<string, IDevice[]>>({});
