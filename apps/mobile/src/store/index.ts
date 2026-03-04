/**
 * Store barrel for apps/mobile.
 *
 * Re-exports all nanostores atoms from @vex-chat/store. Screen components
 * import atoms from here and subscribe via useStore() from @nanostores/react.
 *
 * Usage in a screen component:
 *   import { useStore } from '@nanostores/react'
 *   import { $messages } from '../store'
 *   const messages = useStore($messages)
 *
 * Bootstrap in App.tsx root:
 *   import { bootstrap } from '../store'
 *   useEffect(() => { bootstrap(SERVER_URL, deviceID, deviceKey) }, [])
 */
export {
  // Lifecycle
  bootstrap,
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
} from '@vex-chat/store'
