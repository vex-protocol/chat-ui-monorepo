import type { IUser } from "@vex-chat/libvex";

import { map } from "nanostores";

/**
 * Online users per channel, keyed by channelID.
 * Populated by server presence events (when the WS protocol supports them).
 */
export const $onlineLists = map<Record<string, IUser[]>>({});
