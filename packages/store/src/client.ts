import type { Client } from "@vex-chat/libvex";

import { atom } from "nanostores";

/** Singleton Client instance. Null until bootstrap() is called. */
export const $client = atom<Client | null>(null);
