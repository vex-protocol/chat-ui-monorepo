import type { IChannel, IPermission, IServer, IUser } from "@vex-chat/libvex";

import { map, readonlyType } from "nanostores";

// ── Writable (internal — only VexService imports these) ─────────────────────

export const $serversWritable = map<Record<string, IServer>>({});
export const $channelsWritable = map<Record<string, IChannel[]>>({});
export const $permissionsWritable = map<Record<string, IPermission>>({});
export const $onlineListsWritable = map<Record<string, IUser[]>>({});

// ── Readable (public — components subscribe to these) ───────────────────────

export const $servers = readonlyType($serversWritable);
export const $channels = readonlyType($channelsWritable);
export const $permissions = readonlyType($permissionsWritable);
export const $onlineLists = readonlyType($onlineListsWritable);
