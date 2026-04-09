import type { Channel, Permission, Server, User } from "@vex-chat/libvex";

import { map, readonlyType } from "nanostores";

// ── Writable (internal — only VexService imports these) ─────────────────────

export const $serversWritable = map<Record<string, Server>>({});
export const $channelsWritable = map<Record<string, Channel[]>>({});
export const $permissionsWritable = map<Record<string, Permission>>({});
export const $onlineListsWritable = map<Record<string, User[]>>({});

// ── Readable (public — components subscribe to these) ───────────────────────

export const $servers = readonlyType($serversWritable);
export const $channels = readonlyType($channelsWritable);
export const $permissions = readonlyType($permissionsWritable);
export const $onlineLists = readonlyType($onlineListsWritable);
