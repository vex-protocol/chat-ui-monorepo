import { map } from 'nanostores'
import type { IServer } from '@vex-chat/libvex'

/**
 * Servers the current user is a member of, keyed by serverID.
 * Populated during bootstrap and updated by the 'serverChange' WebSocket event.
 */
export const $servers = map<Record<string, IServer>>({})
