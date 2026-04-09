import type { Permission } from "@vex-chat/libvex";

import { map } from "nanostores";

/**
 * Permissions keyed by permissionID.
 * Populated during bootstrap from per-server permission lists.
 */
export const $permissions = map<Record<string, Permission>>({});
