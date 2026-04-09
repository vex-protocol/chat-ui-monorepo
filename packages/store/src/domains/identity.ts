import type { IDevice, IUser } from "@vex-chat/libvex";

import { atom, map, readonlyType } from "nanostores";

// ── Writable (internal — only VexService imports these) ─────────────────────

export const $userWritable = atom<IUser | null>(null);
export const $familiarsWritable = map<Record<string, IUser>>({});
export const $devicesWritable = map<Record<string, IDevice[]>>({});
export const $avatarHashWritable = atom<number>(0);
export const $keyReplacedWritable = atom<boolean>(false);

// ── Readable (public — components subscribe to these) ───────────────────────

export const $user = readonlyType($userWritable);
export const $familiars = readonlyType($familiarsWritable);
export const $devices = readonlyType($devicesWritable);
export const $avatarHash = readonlyType($avatarHashWritable);
export const $keyReplaced = readonlyType($keyReplacedWritable);
