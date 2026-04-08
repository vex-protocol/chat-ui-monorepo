import type { IUser } from "@vex-chat/libvex";

import { atom } from "nanostores";

/** The currently authenticated user. Null if not logged in. */
export const $user = atom<IUser | null>(null);
