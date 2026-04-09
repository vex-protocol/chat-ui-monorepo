import type { User } from "@vex-chat/libvex";

import { map } from "nanostores";

/**
 * Users this client has exchanged messages with, keyed by userID.
 * Populated when the server adds familiars endpoints.
 */
export const $familiars = map<Record<string, User>>({});
