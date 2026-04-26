import type { Device, User } from "@vex-chat/libvex";

import { atom, map, readonlyType } from "nanostores";

export type AuthStatus =
    | "authenticated"
    | "checking"
    | "offline"
    | "signed_out"
    | "unauthorized";

// ── Writable (internal — only VexService imports these) ─────────────────────

export const $userWritable = atom<null | User>(null);
export const $familiarsWritable = map<Record<string, User>>({});
export const $devicesWritable = map<Record<string, Device[]>>({});
export const $avatarHashWritable = atom<number>(0);
export const $authStatusWritable = atom<AuthStatus>("signed_out");
export const $keyReplacedWritable = atom<boolean>(false);

// ── Readable (public — components subscribe to these) ───────────────────────

export const $user = readonlyType($userWritable);
export const $familiars = readonlyType($familiarsWritable);
export const $devices = readonlyType($devicesWritable);
export const $avatarHash = readonlyType($avatarHashWritable);
export const $authStatus = readonlyType($authStatusWritable);
export const $keyReplaced = readonlyType($keyReplacedWritable);
