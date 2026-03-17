/**
 * Runtime configuration helpers.
 *
 * Device credential storage is handled by KeyStore (see keystore.ts).
 * This module only manages the server URL and session state.
 */

const SERVER_URL_KEY = 'vex-server-url'

const DEFAULT_SERVER_URL = import.meta.env.VITE_SERVER_URL ?? (import.meta.env.DEV ? '' : 'http://localhost:16777')

// ── Server URL ────────────────────────────────────────────────────────────────

export function getServerUrl(): string {
  return localStorage.getItem(SERVER_URL_KEY) ?? DEFAULT_SERVER_URL
}

export function setServerUrl(url: string): void {
  localStorage.setItem(SERVER_URL_KEY, url.replace(/\/$/, ''))
}

/** Clears only the session (server URL) — device keys in KeyStore are preserved. */
export function clearSession(): void {
  localStorage.removeItem(SERVER_URL_KEY)
}
