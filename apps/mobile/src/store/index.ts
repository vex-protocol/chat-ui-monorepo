/**
 * Store barrel for apps/mobile.
 *
 * Re-exports all nanostores atoms from @vex-chat/store. Screen components
 * import atoms from here and subscribe via useStore() from @nanostores/react.
 */
export {
    // Auth flows
    registerAndBootstrap,
    loginAndBootstrap,
    autoLogin,

    // Client / key-replaced flag
    $client,
    $keyReplaced,

    // State atoms
    $user,
    $familiars,
    $messages,
    $groupMessages,
    $servers,
    $channels,
    $permissions,
    $devices,
    $onlineLists,
} from "@vex-chat/store";

export type { ServerOptions, AuthResult } from "@vex-chat/store";
