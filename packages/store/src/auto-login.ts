import type { KeyStore } from '@vex-chat/types'
import { decodeHex } from '@vex-chat/crypto'
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
 * Encapsulates the common flow shared by all platforms:
 *   1. Load active credentials from platform KeyStore
 *   2. Decode hex-encoded keys to Uint8Array
 *   3. Call bootstrap() with optional persistence callbacks
 *   4. Return structured result for the app to act on
 *
 * Platform apps provide:
 *   - KeyStore implementation (Tauri plugin-store, OS keychain, etc.)
 *   - PersistenceCallbacks implementation (IndexedDB, AsyncStorage, etc.)
 *   - Navigation after the result (platform-specific routing)
 */
export async function autoLogin(
  keyStore: KeyStore,
  serverUrl: string,
  persistence?: PersistenceCallbacks,
): Promise<AutoLoginResult> {
  const creds = await keyStore.loadActive()
  if (!creds || !creds.token) return { ok: false }

  try {
    const deviceKey = decodeHex(creds.deviceKey)
    const preKeySecret = decodeHex(creds.preKey)
    await bootstrap(serverUrl, creds.deviceID, deviceKey, creds.token, preKeySecret, persistence)
    return { ok: true }
  } catch (err: any) {
    if ($keyReplaced.get()) return { ok: false, keyReplaced: true }
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}
