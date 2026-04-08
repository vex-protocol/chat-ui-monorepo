import { map } from "nanostores";
import type { IUser } from "@vex-chat/libvex";

/**
 * Users this client has exchanged messages with, keyed by userID.
 * Populated when the server adds familiars endpoints.
 */
export const $familiars = map<Record<string, IUser>>({});
