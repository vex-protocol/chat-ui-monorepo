import type { Kysely } from 'kysely'
import type { Database } from '../db/types.js'

export interface DevicePayload {
  signKey: string          // hex-encoded NaCl Ed25519 public signing key (must match /^[0-9a-f]{64}$/)
  preKey: string           // hex-encoded medium-term preKey public key
  preKeySignature: string  // hex-encoded NaCl signature of preKey bytes
  preKeyIndex: number
  deviceName: string
}

export interface Device {
  deviceID: string
  signKey: string
  owner: string    // userID
  name: string
  lastLogin: string | null  // ISO timestamp; null = never logged in
  deleted: number           // 0 | 1
}

/**
 * Creates a device + preKey atomically for the given user.
 *
 * signKey must match /^[0-9a-f]{64}$/ (64 lowercase hex chars).
 * NaCl signature verification is the caller's responsibility (route handler).
 *
 * Throws on duplicate signKey or invalid signKey format.
 */
export async function createDevice(
  _db: Kysely<Database>,
  _owner: string,
  _payload: DevicePayload,
): Promise<Device> {
  throw new Error('not implemented')
}

/**
 * Returns the device by UUID, or null if not found or soft-deleted.
 */
export async function retrieveDevice(
  _db: Kysely<Database>,
  _deviceID: string,
): Promise<Device | null> {
  throw new Error('not implemented')
}

/**
 * Returns the device by its NaCl signing public key (hex), or null if not found or soft-deleted.
 */
export async function retrieveDeviceBySignKey(
  _db: Kysely<Database>,
  _signKey: string,
): Promise<Device | null> {
  throw new Error('not implemented')
}

/**
 * Returns all non-deleted devices owned by the given user.
 */
export async function retrieveUserDeviceList(
  _db: Kysely<Database>,
  _userID: string,
): Promise<Device[]> {
  throw new Error('not implemented')
}

/**
 * Soft-deletes a device: sets deleted=1. The row is retained.
 * Also deletes associated preKeys and oneTimeKeys.
 */
export async function deleteDevice(
  _db: Kysely<Database>,
  _deviceID: string,
): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Updates the lastLogin timestamp for a device to the current time.
 */
export async function markDeviceLogin(
  _db: Kysely<Database>,
  _deviceID: string,
): Promise<void> {
  throw new Error('not implemented')
}
