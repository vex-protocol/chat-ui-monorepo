import { map } from 'nanostores'
import type { IDevice } from '@vex-chat/libvex'

/**
 * Devices per user, keyed by ownerID (userID).
 * Populated during bootstrap for each familiar.
 */
export const $devices = map<Record<string, IDevice[]>>({})
