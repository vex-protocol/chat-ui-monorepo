/**
 * Runtime configuration helpers.
 *
 * Key storage currently uses localStorage. Upgrade path:
 *   TODO(vex-chat-tyu): replace localStorage with @tauri-apps/plugin-fs once
 *   tauri-plugin-fs is added to Cargo.toml and registered in lib.rs.
 *   Device key: appData/vex-chat/keys/{username}  (hex-encoded 32-byte seed)
 *   PreKey:     appData/vex-chat/prekeys/{username}
 */

const KEYS = {
  serverUrl:  'vex-server-url',
  username:   'vex-username',
  deviceID:   'vex-device-id',
  deviceKey:  'vex-device-key',
  preKey:     'vex-prekey',
} as const

const DEFAULT_SERVER_URL = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:16777')

// ── Server URL ────────────────────────────────────────────────────────────────

export function getServerUrl(): string {
  return localStorage.getItem(KEYS.serverUrl) ?? DEFAULT_SERVER_URL
}

export function setServerUrl(url: string): void {
  localStorage.setItem(KEYS.serverUrl, url.replace(/\/$/, ''))
}

// ── Device credentials ────────────────────────────────────────────────────────

export interface DeviceCredentials {
  username:   string
  deviceID:   string
  deviceKey:  string  // hex-encoded 32-byte Ed25519 secret key seed
  preKey:     string  // hex-encoded 32-byte preKey secret seed
}

export function loadCredentials(): DeviceCredentials | null {
  const username  = localStorage.getItem(KEYS.username)
  const deviceID  = localStorage.getItem(KEYS.deviceID)
  const deviceKey = localStorage.getItem(KEYS.deviceKey)
  const preKey    = localStorage.getItem(KEYS.preKey)
  if (!username || !deviceID || !deviceKey || !preKey) return null
  return { username, deviceID, deviceKey, preKey }
}

export function saveCredentials(creds: DeviceCredentials): void {
  localStorage.setItem(KEYS.username,  creds.username)
  localStorage.setItem(KEYS.deviceID,  creds.deviceID)
  localStorage.setItem(KEYS.deviceKey, creds.deviceKey)
  localStorage.setItem(KEYS.preKey,    creds.preKey)
}

export function clearCredentials(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
}

export function hasCredentials(): boolean {
  return loadCredentials() !== null
}
