import type { KeyStore } from '@vex-chat/types'
import { bootstrap, $keyReplaced } from './bootstrap.ts'
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
 */
export async function autoLogin(
  keyStore: KeyStore,
  options: { host?: string; unsafeHttp?: boolean },
  persistence?: PersistenceCallbacks,
): Promise<AutoLoginResult> {
  const creds = await keyStore.load()
  if (!creds) return { ok: false }

  try {
    await bootstrap(creds.deviceKey, options, persistence)
    return { ok: true }
  } catch (err: any) {
    if ($keyReplaced.get()) return { ok: false, keyReplaced: true }
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}
