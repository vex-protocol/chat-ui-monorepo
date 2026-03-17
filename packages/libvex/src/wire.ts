/**
 * Wire format adapter for old spire (v0.8.0).
 *
 * Old spire sends msgpack-encoded responses with Date objects and nested
 * structures. This module normalizes them into the shapes that @vex-chat/types
 * expects (ISO strings, flat structures, hex strings).
 */
import type { IUser, IDevice, IServer, IKeyBundle, IPreKey, IOneTimeKey } from '@vex-chat/types'
import { encodeHex } from '@vex-chat/crypto'

// ── Primitives ──────────────────────────────────────────────────────────────

/** Convert a value to ISO string if it's a Date, otherwise pass through. */
export function normalizeDate(v: unknown): string {
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'number') return new Date(v).toISOString()
  if (typeof v === 'string') return v
  return String(v)
}

/** Convert a value to hex string if it's a Uint8Array, otherwise pass through. */
function normalizeHex(v: unknown): string {
  if (v instanceof Uint8Array) return encodeHex(v)
  if (typeof v === 'string') return v
  return String(v)
}

// ── Response normalizers ────────────────────────────────────────────────────

/**
 * Normalize a user response from old spire.
 * Old: { userID, username, lastSeen: Date }
 * New: { userID, username, lastSeen: string }
 */
export function normalizeUser(raw: Record<string, unknown>): IUser {
  return {
    userID: raw['userID'] as string,
    username: raw['username'] as string,
    lastSeen: normalizeDate(raw['lastSeen']),
  }
}

/**
 * Normalize a device response from old spire.
 * Old: { deviceID, signKey, owner, name, lastLogin, deleted }
 * New: { deviceID, signKey, owner, name, lastLogin: string | null }
 */
export function normalizeDevice(raw: Record<string, unknown>): IDevice {
  return {
    deviceID: raw['deviceID'] as string,
    signKey: raw['signKey'] as string,
    owner: raw['owner'] as string,
    name: raw['name'] as string,
    lastLogin: raw['lastLogin'] ? normalizeDate(raw['lastLogin']) : null,
  }
}

/**
 * Normalize a server response from old spire.
 * Old: { serverID, name, icon? }
 * New: { serverID, name, icon: string }
 */
export function normalizeServer(raw: Record<string, unknown>): IServer {
  return {
    serverID: raw['serverID'] as string,
    name: raw['name'] as string,
    icon: (raw['icon'] as string) ?? '',
  }
}

/**
 * Normalize a key bundle from old spire.
 * Old: signKey as Uint8Array, preKey/otk fields as Uint8Array
 * New: all hex strings
 */
export function normalizeKeyBundle(raw: Record<string, unknown>): IKeyBundle {
  const preKeyRaw = raw['preKey'] as Record<string, unknown>
  const otkRaw = raw['otk'] as Record<string, unknown> | null | undefined

  const preKey: IPreKey = {
    publicKey: normalizeHex(preKeyRaw['publicKey']),
    signature: normalizeHex(preKeyRaw['signature']),
    index: preKeyRaw['index'] as number,
  }

  let otk: IOneTimeKey | null = null
  if (otkRaw) {
    otk = {
      publicKey: normalizeHex(otkRaw['publicKey']),
      signature: normalizeHex(otkRaw['signature']),
      index: otkRaw['index'] as number,
    }
  }

  return {
    signKey: normalizeHex(raw['signKey']),
    preKey,
    otk,
  }
}

/**
 * Normalize a login response from old spire.
 * Old: { user: { userID, username, lastSeen }, token }
 * New: { token, userID, username, lastSeen }
 */
export function normalizeLoginResponse(
  raw: Record<string, unknown>,
): { token: string; userID: string; username: string; lastSeen: string } {
  // Handle both nested (old spire) and flat (new/future server) shapes
  if ('user' in raw && typeof raw['user'] === 'object' && raw['user'] !== null) {
    const user = raw['user'] as Record<string, unknown>
    return {
      token: raw['token'] as string,
      userID: user['userID'] as string,
      username: user['username'] as string,
      lastSeen: normalizeDate(user['lastSeen']),
    }
  }
  // Already flat
  return {
    token: raw['token'] as string,
    userID: raw['userID'] as string,
    username: raw['username'] as string,
    lastSeen: normalizeDate(raw['lastSeen']),
  }
}

/**
 * Normalize a whoami response from old spire.
 * Old: { user: { userID, username, lastSeen }, exp, token }
 * New: IUser
 */
export function normalizeWhoami(raw: Record<string, unknown>): IUser {
  if ('user' in raw && typeof raw['user'] === 'object' && raw['user'] !== null) {
    return normalizeUser(raw['user'] as Record<string, unknown>)
  }
  return normalizeUser(raw)
}
