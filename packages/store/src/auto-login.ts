import type { KeyStore, IClientOptions, IStorage } from '@vex-chat/libvex'
import { bootstrap } from './bootstrap.ts'
import { $keyReplaced } from './key-replaced.ts'
import type { PersistenceCallbacks } from './bootstrap.ts'

export interface AutoLoginResult {
  ok: boolean
  keyReplaced?: boolean
  error?: string
}

/**
 * Attempts auto-login from stored credentials.
 *
 * Platform apps provide:
 *   - KeyStore implementation (Tauri plugin-store, OS keychain, etc.)
 *   - PersistenceCallbacks implementation (IndexedDB, AsyncStorage, etc.)
 *   - Navigation after the result (platform-specific routing)
 *   - adapters via options (reactNativeAdapters, browserAdapters, etc.)
 */
export async function autoLogin(
  keyStore: KeyStore,
  options?: IClientOptions,
  persistence?: PersistenceCallbacks,
  storage?: IStorage,
): Promise<AutoLoginResult> {
  const creds = await keyStore.load()
  if (!creds) return { ok: false }

  try {
    await bootstrap(creds.deviceKey, options, persistence, storage)
    return { ok: true }
  } catch (err: any) {
    if ($keyReplaced.get()) return { ok: false, keyReplaced: true }
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}
