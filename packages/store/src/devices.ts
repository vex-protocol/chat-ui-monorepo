import type { Device } from "@vex-chat/libvex";

import { map } from "nanostores";

/**
 * Devices per user, keyed by ownerID (userID).
 * Populated during bootstrap for each familiar.
 */
export const $devices = map<Record<string, Device[]>>({});
