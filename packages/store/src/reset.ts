import { $client } from "./client.ts";
import { $keyReplaced } from "./key-replaced.ts";
import { $user } from "./user.ts";
import { $familiars } from "./familiars.ts";
import { $messages, $groupMessages } from "./messages.ts";
import { $servers } from "./servers.ts";
import { $channels } from "./channels.ts";
import { $permissions } from "./permissions.ts";
import { $devices } from "./devices.ts";
import { $onlineLists } from "./onlineLists.ts";
import { $avatarHash } from "./avatarHash.ts";
import { $dmUnreadCounts, $channelUnreadCounts } from "./unread.ts";

/**
 * Resets all nanostores atoms to their default values.
 * Call on logout before navigating to prevent stale data leaking
 * to the next user session.
 *
 * Note: $verifiedKeys is intentionally NOT reset — verified fingerprints
 * are device-scoped and persist across accounts.
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
