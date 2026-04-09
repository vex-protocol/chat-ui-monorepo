/**
 * Store barrel for apps/mobile.
 *
 * Re-exports all nanostores atoms from @vex-chat/store. Screen components
 * import atoms from here and subscribe via useStore() from @nanostores/react.
 */
export {
    $channels,
    $devices,
    $familiars,
    $groupMessages,

    // Key-replaced flag
    $keyReplaced,
    $messages,
    $onlineLists,
    $permissions,
    $servers,
    // State atoms
    $user,
    // VexService singleton
    vexService,
} from "@vex-chat/store";

export type { AuthResult, ServerOptions } from "@vex-chat/store";
