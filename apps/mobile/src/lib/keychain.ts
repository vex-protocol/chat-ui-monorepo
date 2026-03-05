import * as Keychain from 'react-native-keychain'

const SERVICE_NAME = 'com.vex-chat.device-credentials'

export interface DeviceCredentials {
  username: string
  deviceID: string
  deviceKey: string   // hex-encoded Ed25519 secret key
  preKey: string      // hex-encoded Ed25519 secret key
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
