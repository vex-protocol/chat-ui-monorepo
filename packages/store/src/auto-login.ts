import type { KeyStore, PlatformPreset } from '@vex-chat/libvex'
import { bootstrap } from './bootstrap.ts'
import { $keyReplaced } from './key-replaced.ts'

export interface AutoLoginResult {
  ok: boolean
  keyReplaced?: boolean
  error?: string
}

/**
 * Attempts auto-login from stored credentials.
 *
 * @param keyStore - Platform-specific credential store (OS keychain, expo-secure-store, etc.)
 * @param preset   - Platform preset (adapters + storage factory)
 * @param options  - Client options (host, logLevel, etc.)
 */
export async function autoLogin(
  keyStore: KeyStore,
  preset: PlatformPreset,
  options?: { host?: string; unsafeHttp?: boolean },
): Promise<AutoLoginResult> {
  const creds = await keyStore.load()
  if (!creds) return { ok: false }

  try {
    await bootstrap(creds.deviceKey, preset, options)
    return { ok: true }
  } catch (err: any) {
    if ($keyReplaced.get()) return { ok: false, keyReplaced: true }
    return { ok: false, error: err?.message ?? 'Unknown error' }
  }
}
