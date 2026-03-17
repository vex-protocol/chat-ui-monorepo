/** Credentials stored on-device for a registered user+device pair. */
export interface StoredCredentials {
  username: string
  deviceID: string
  deviceKey: string  // hex-encoded 32-byte Ed25519 secret key seed
  preKey: string     // hex-encoded 32-byte preKey secret seed
}

/**
 * Platform-agnostic interface for persisting device credentials.
 *
 * Each platform provides its own implementation:
 *   - Desktop (Tauri): file-backed via @tauri-apps/plugin-fs or plugin-store
 *   - Mobile: OS keychain (iOS Keychain, Android Keystore)
 *   - Bot/Node: plain filesystem (~/.vex/keys/{username})
 *   - Web fallback: localStorage or IndexedDB
 *
 * Implementations MUST persist credentials durably — sign-out must not
 * delete device keys. Only an explicit "clear keys" action should call clear().
 */
export interface KeyStore {
  /** Load credentials for a specific username. Returns null if none stored. */
  load(username: string): Promise<StoredCredentials | null>

  /** Load the most recently active credentials (for auto-login on app start). */
  loadActive(): Promise<StoredCredentials | null>

  /** Save credentials and mark this user as active. */
  save(creds: StoredCredentials): Promise<void>

  /** Delete credentials for a username. Used only for explicit "clear device keys." */
  clear(username: string): Promise<void>
}
