import { map } from 'nanostores'
import type { IPermission } from '@vex-chat/libvex'

/**
 * Permissions keyed by permissionID.
 * Populated during bootstrap from per-server permission lists.
 */
export const $permissions = map<Record<string, IPermission>>({})
