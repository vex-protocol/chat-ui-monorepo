import * as Keychain from 'react-native-keychain'
import type { KeyStore, StoredCredentials } from '@vex-chat/libvex'

const SERVICE_NAME = 'com.vex-chat.device-credentials'

export interface DeviceCredentials {
  username: string
  deviceID: string
  deviceKey: string   // hex-encoded Ed25519 secret key
  preKey: string      // hex-encoded Ed25519 secret key
  token?: string      // JWT auth token for HTTP calls
}

export async function saveCredentials(creds: DeviceCredentials): Promise<void> {
  await Keychain.setGenericPassword(
    creds.username,
    JSON.stringify(creds),
    { service: SERVICE_NAME },
  )
}

export async function loadCredentials(): Promise<DeviceCredentials | null> {
  const result = await Keychain.getGenericPassword({ service: SERVICE_NAME })
  if (!result) return null
  return JSON.parse(result.password) as DeviceCredentials
}

export async function clearCredentials(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE_NAME })
}

/**
 * KeyStore adapter for React Native OS keychain.
 * Single-user keychain: load/loadActive both return the stored credentials.
 */
export const keychainKeyStore: KeyStore = {
  async load(_username: string): Promise<StoredCredentials | null> {
    return loadCredentials()
  },
  async loadActive(): Promise<StoredCredentials | null> {
    return loadCredentials()
  },
  async save(creds: StoredCredentials): Promise<void> {
    await saveCredentials(creds)
  },
  async clear(_username: string): Promise<void> {
    await clearCredentials()
  },
}
