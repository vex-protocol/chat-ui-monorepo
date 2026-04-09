// Re-export all atoms without the $ prefix so Svelte's reactive $ syntax works cleanly.
export {
    $avatarHash as avatarHash,
    $channels as channels,
    $devices as devices,
    $familiars as familiars,
    $groupMessages as groupMessages,
    $keyReplaced as keyReplaced,
    $messages as messages,
    $onlineLists as onlineLists,
    $permissions as permissions,
    $servers as servers,
    $user as user,
} from "@vex-chat/store";

export { vexService } from "@vex-chat/store";
// TODO: verified keys removed — needs secure storage re-implementation
