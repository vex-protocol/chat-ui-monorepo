// Re-export all atoms without the $ prefix so Svelte's reactive $ syntax works cleanly.
// Usage: import { user, messages } from '$lib/store'
//        In template: {$user?.username}  {#each $messages[id] ?? [] as mail}

export {
  $messages as messages,
  $groupMessages as groupMessages,
  $user as user,
  $servers as servers,
  $channels as channels,
  $permissions as permissions,
  $devices as devices,
  $familiars as familiars,
  $onlineLists as onlineLists,
  $client as client,
  $keyReplaced as keyReplaced,
  $avatarHash as avatarHash,
} from '@vex-chat/store'

export { resetAll, markVerified, unmarkVerified, isVerified } from '@vex-chat/store'
export { $verifiedKeys as verifiedKeys } from '@vex-chat/store'

// Desktop-specific bootstrap: injects browser adapters + Tauri SQLite storage
// so the store never dynamically imports Node-only modules.
import { bootstrap } from '@vex-chat/store'
import { browserAdapters } from '@vex-chat/libvex'
import { createTauriStorage } from '@vex-chat/libvex/storage/tauri'
import type { IClientOptions, ILogger } from '@vex-chat/libvex'

const desktopLogger: ILogger = {
  info: (msg: string) => console.log(msg),
  warn: (msg: string) => console.warn(msg),
  error: (msg: string) => console.error(msg),
  debug: (msg: string) => console.debug(msg),
}

export async function desktopBootstrap(
  privateKey: string,
  options: Omit<IClientOptions, 'adapters'> & { host?: string; unsafeHttp?: boolean },
): Promise<void> {
  const storage = createTauriStorage('vex-client.db', privateKey, desktopLogger, options as IClientOptions)
  return bootstrap(privateKey, {
    ...options,
    adapters: browserAdapters(),
  }, undefined, storage)
}
