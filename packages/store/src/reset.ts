import { $avatarHash } from "./avatarHash.ts";
import { $channels } from "./channels.ts";
import { $client } from "./client.ts";
import { $devices } from "./devices.ts";
import { $familiars } from "./familiars.ts";
import { $keyReplaced } from "./key-replaced.ts";
import { $groupMessages, $messages } from "./messages.ts";
import { $onlineLists } from "./onlineLists.ts";
import { $permissions } from "./permissions.ts";
import { $servers } from "./servers.ts";
import { $channelUnreadCounts, $dmUnreadCounts } from "./unread.ts";
import { $user } from "./user.ts";

/**
 * Resets all nanostores atoms to their default values.
 * Call on logout before navigating to prevent stale data leaking
 * to the next user session.
 *
 * TODO: once verified keys are re-implemented with secure storage,
 * they should persist across accounts (device-scoped, not reset here).
 */
export function resetAll(): void {
    $client.set(null);
    $keyReplaced.set(false);
    $user.set(null);
    $familiars.set({});
    $messages.set({});
    $groupMessages.set({});
    $servers.set({});
    $channels.set({});
    $permissions.set({});
    $devices.set({});
    $onlineLists.set({});
    $avatarHash.set(0);
    $dmUnreadCounts.set({});
    $channelUnreadCounts.set({});
}
