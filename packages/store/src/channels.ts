import { map } from "nanostores";
import type { IChannel } from "@vex-chat/libvex";

/**
 * Channels per server, keyed by serverID.
 * Populated during bootstrap for each server in $servers.
 */
export const $channels = map<Record<string, IChannel[]>>({});
