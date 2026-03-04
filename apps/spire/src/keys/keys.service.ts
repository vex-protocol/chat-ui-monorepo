import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'
import type { KeyBundle, OTKPayload } from './keys.schemas.js'
export type { KeyBundle, OTKPayload } from './keys.schemas.js'

/**
 * Upserts the pre-key for a device. Because deviceID is UNIQUE in the
 * preKeys table, a second save replaces the first.
 *
 * Callers (route handlers) are responsible for validating publicKey format
 * and verifying the NaCl signature before calling this function.
 */
export async function savePreKey(
  _db: Kysely<Database>,
  _userID: string,
  _deviceID: string,
  _publicKey: string,
  _signature: string,
  _index: number,
): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Returns the pre-key for a device, or null if not found.
 */
export async function getPreKey(
  _db: Kysely<Database>,
  _deviceID: string,
): Promise<{ keyID: string; publicKey: string; signature: string; index: number } | null> {
  throw new Error('not implemented')
}

/**
 * Batch-inserts one-time keys for a device.
 */
export async function saveOTKs(
  _db: Kysely<Database>,
  _userID: string,
  _deviceID: string,
  _keys: OTKPayload[],
): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Returns the one-time key with the lowest index for a device, atomically
 * deletes it, and returns it. Returns null if no OTKs remain.
 */
export async function consumeOTK(
  _db: Kysely<Database>,
  _deviceID: string,
): Promise<{ publicKey: string; signature: string; index: number } | null> {
  throw new Error('not implemented')
}

/**
 * Returns the count of remaining one-time keys for a device.
 */
export async function getOTKCount(
  _db: Kysely<Database>,
  _deviceID: string,
): Promise<number> {
  throw new Error('not implemented')
}

/**
 * Assembles the key bundle needed for X3DH key exchange:
 *   signKey  — the device's NaCl signing public key (from devices table)
 *   preKey   — the device's medium-term pre-key
 *   otk      — one consumed one-time key, or null if none remain
 *
 * Returns null if the device does not exist or has no pre-key.
 */
export async function getKeyBundle(
  _db: Kysely<Database>,
  _deviceID: string,
): Promise<KeyBundle | null> {
  throw new Error('not implemented')
}
