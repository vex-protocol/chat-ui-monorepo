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
  autoLogin,
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
export type { PersistenceCallbacks } from '@vex-chat/store'

// Pre-built persistence callbacks for mobile (AsyncStorage)
import { loadMessages, saveGroupMessages, saveDmMessages } from '../lib/messages'
import type { PersistenceCallbacks } from '@vex-chat/store'
export const mobilePersistence: PersistenceCallbacks = { loadMessages, saveGroupMessages, saveDmMessages }

// Mobile-specific bootstrap: injects RN adapters + expo-sqlite storage so the
// store never dynamically imports Node-only modules (ws, better-sqlite3).
import { bootstrap as _bootstrap } from '@vex-chat/store'
import { reactNativeAdapters } from '@vex-chat/libvex'
import { createExpoStorage } from '@vex-chat/libvex/storage/expo'
import type { IClientOptions, ILogger } from '@vex-chat/libvex'

const rnLogger: ILogger = {
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  debug: (msg: string) => console.debug(msg),
}

export async function mobileBootstrap(
  privateKey: string,
  options: Omit<IClientOptions, 'adapters'> & { host?: string; unsafeHttp?: boolean },
  persistence?: PersistenceCallbacks,
): Promise<void> {
  const storage = createExpoStorage('vex-client.db', privateKey, rnLogger, options as IClientOptions)
  return _bootstrap(privateKey, {
    ...options,
    adapters: reactNativeAdapters(),
  }, persistence, storage)
}
