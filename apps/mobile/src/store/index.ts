/**
 * Store barrel for apps/mobile.
 *
 * Re-exports all nanostores atoms from @vex-chat/store. Screen components
 * import atoms from here and subscribe via useStore() from @nanostores/react.
 */
export {
    $channels,
    // Client / key-replaced flag
    $client,
    $devices,

    $familiars,
    $groupMessages,

    $keyReplaced,
    $messages,
    $onlineLists,
    $permissions,
    $servers,
    // State atoms
    $user,
    autoLogin,
    loginAndBootstrap,
    // Auth flows
    registerAndBootstrap,
} from "@vex-chat/store";

export type { AuthResult, ServerOptions } from "@vex-chat/store";
