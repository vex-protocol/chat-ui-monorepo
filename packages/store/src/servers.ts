import type { IServer } from "@vex-chat/libvex";

import { map } from "nanostores";

/**
 * Servers the current user is a member of, keyed by serverID.
 * Populated during bootstrap and updated by the 'serverChange' WebSocket event.
 */
export const $servers = map<Record<string, IServer>>({});
