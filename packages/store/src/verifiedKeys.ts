import { atom } from 'nanostores'

/**
 * Set of verified signKeys (hex Ed25519 pubkeys).
 * Stored in localStorage for persistence across sessions.
 * A key being in this set means the user has manually verified
 * the conversation fingerprint with that device's owner.
 */

const STORAGE_KEY = 'vex-verified-keys'

function loadVerified(): Set<string> {
  try {
    const stored = globalThis.localStorage?.getItem(STORAGE_KEY)
    if (stored) return new Set(JSON.parse(stored) as string[])
  } catch { /* ignore */ }
  return new Set()
}

function saveVerified(keys: Set<string>): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify([...keys]))
  } catch { /* ignore */ }
}

export const $verifiedKeys = atom<Set<string>>(loadVerified())

export function markVerified(signKey: string): void {
  const keys = new Set($verifiedKeys.get())
  keys.add(signKey)
  $verifiedKeys.set(keys)
  saveVerified(keys)
}

export function unmarkVerified(signKey: string): void {
  const keys = new Set($verifiedKeys.get())
  keys.delete(signKey)
  $verifiedKeys.set(keys)
  saveVerified(keys)
}

export function isVerified(signKey: string): boolean {
  return $verifiedKeys.get().has(signKey)
}
