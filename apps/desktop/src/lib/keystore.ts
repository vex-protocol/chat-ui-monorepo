import { load } from '@tauri-apps/plugin-store'
import type { KeyStore, StoredCredentials } from '@vex-chat/libvex'

const STORE_FILE = 'keystore.json'
const ACTIVE_KEY = '__active__'

/**
 * KeyStore backed by @tauri-apps/plugin-store.
 *
 * Writes to $APPDATA/com.vex-chat.desktop/keystore.json — a plain JSON
 * file that survives WebView resets and "Clear site data". Each username
 * gets its own key in the store; `__active__` tracks the last-used account.
 */
class TauriKeyStore implements KeyStore {
  private storePromise: ReturnType<typeof load> | null = null

  private getStore() {
    if (!this.storePromise) {
      this.storePromise = load(STORE_FILE, { autoSave: true })
    }
    return this.storePromise
  }

  async load(username: string): Promise<StoredCredentials | null> {
    const store = await this.getStore()
    return (await store.get<StoredCredentials>(username)) ?? null
  }

  async loadActive(): Promise<StoredCredentials | null> {
    const store = await this.getStore()
    const username = await store.get<string>(ACTIVE_KEY)
    if (!username) return null
    return (await store.get<StoredCredentials>(username)) ?? null
  }

  async save(creds: StoredCredentials): Promise<void> {
    const store = await this.getStore()
    await store.set(creds.username, creds)
    await store.set(ACTIVE_KEY, creds.username)
  }

  async clear(username: string): Promise<void> {
    const store = await this.getStore()
    await store.delete(username)
    const active = await store.get<string>(ACTIVE_KEY)
    if (active === username) {
      await store.delete(ACTIVE_KEY)
    }
  }
}

// ── localStorage fallback (dev mode without Tauri runtime) ──────────────────

const LS_PREFIX = 'vex-ks-'
const LS_ACTIVE = 'vex-active-user'

class LocalStorageKeyStore implements KeyStore {
  async load(username: string): Promise<StoredCredentials | null> {
    const raw = localStorage.getItem(LS_PREFIX + username)
    if (!raw) return null
    try { return JSON.parse(raw) as StoredCredentials } catch { return null }
  }

  async loadActive(): Promise<StoredCredentials | null> {
    const username = localStorage.getItem(LS_ACTIVE)
    if (!username) return null
    return this.load(username)
  }

  async save(creds: StoredCredentials): Promise<void> {
    localStorage.setItem(LS_PREFIX + creds.username, JSON.stringify(creds))
    localStorage.setItem(LS_ACTIVE, creds.username)
  }

  async clear(username: string): Promise<void> {
    localStorage.removeItem(LS_PREFIX + username)
    if (localStorage.getItem(LS_ACTIVE) === username) {
      localStorage.removeItem(LS_ACTIVE)
    }
  }
}

// ── Export ───────────────────────────────────────────────────────────────────

/** Uses Tauri plugin-store when running inside Tauri, falls back to localStorage in dev browser. */
export const keyStore: KeyStore = '__TAURI_INTERNALS__' in window
  ? new TauriKeyStore()
  : new LocalStorageKeyStore()
