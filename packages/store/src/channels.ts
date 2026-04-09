import type { Channel } from "@vex-chat/libvex";

import { map } from "nanostores";

/**
 * Channels per server, keyed by serverID.
 * Populated during bootstrap for each server in $servers.
 */
export const $channels = map<Record<string, Channel[]>>({});
