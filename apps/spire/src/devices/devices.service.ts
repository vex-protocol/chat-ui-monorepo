import type { Kysely } from 'kysely'
import { v4 as uuidv4 } from 'uuid'
import type { Database } from '#db/types.js'
import type { Device, DevicePayload } from './devices.schemas.js'
export type { Device, DevicePayload } from './devices.schemas.js'

/**
 * Creates a device + preKey atomically for the given user.
 *
 * signKey must match /^[0-9a-f]{64}$/ (64 lowercase hex chars).
 * NaCl signature verification is the caller's responsibility (route handler).
 *
 * Throws on duplicate signKey or invalid signKey format.
 */
export async function createDevice(
  db: Kysely<Database>,
  owner: string,
  payload: DevicePayload,
): Promise<Device> {
  const deviceID = uuidv4()

  await db.transaction().execute(async trx => {
    await trx
      .insertInto('devices')
      .values({
        deviceID,
        signKey: payload.signKey,
        owner,
        name: payload.deviceName,
        lastLogin: null,
        deleted: 0,
      })
      .execute()

    await trx
      .insertInto('preKeys')
      .values({
        keyID: uuidv4(),
        userID: owner,
        deviceID,
        publicKey: payload.preKey,
        signature: payload.preKeySignature,
        index: payload.preKeyIndex,
      })
      .execute()
  })

  return {
    deviceID,
    signKey: payload.signKey,
    owner,
    name: payload.deviceName,
    lastLogin: null,
    deleted: 0,
  }
}

/**
 * Returns the device by UUID, or null if not found or soft-deleted.
 */
export async function retrieveDevice(
  db: Kysely<Database>,
  deviceID: string,
): Promise<Device | null> {
  const row = await db
    .selectFrom('devices')
    .where('deviceID', '=', deviceID)
    .where('deleted', '=', 0)
    .selectAll()
    .executeTakeFirst()

  return row ?? null
}

/**
 * Returns the device by its NaCl signing public key (hex), or null if not found or soft-deleted.
 */
export async function retrieveDeviceBySignKey(
  db: Kysely<Database>,
  signKey: string,
): Promise<Device | null> {
  const row = await db
    .selectFrom('devices')
    .where('signKey', '=', signKey)
    .where('deleted', '=', 0)
    .selectAll()
    .executeTakeFirst()

  return row ?? null
}

/**
 * Returns all non-deleted devices owned by the given user.
 */
export async function retrieveUserDeviceList(
  db: Kysely<Database>,
  userID: string,
): Promise<Device[]> {
  return db
    .selectFrom('devices')
    .where('owner', '=', userID)
    .where('deleted', '=', 0)
    .selectAll()
    .execute()
}

/**
 * Soft-deletes a device: sets deleted=1. The row is retained.
 * Also deletes associated preKeys and oneTimeKeys.
 */
export async function deleteDevice(
  db: Kysely<Database>,
  deviceID: string,
): Promise<void> {
  await db.transaction().execute(async trx => {
    await trx.deleteFrom('preKeys').where('deviceID', '=', deviceID).execute()
    await trx.deleteFrom('oneTimeKeys').where('deviceID', '=', deviceID).execute()
    await trx.updateTable('devices').set({ deleted: 1 }).where('deviceID', '=', deviceID).execute()
  })
}

/**
 * Updates the lastLogin timestamp for a device to the current time.
 */
export async function markDeviceLogin(
  db: Kysely<Database>,
  deviceID: string,
): Promise<void> {
  await db
    .updateTable('devices')
    .set({ lastLogin: new Date().toISOString() })
    .where('deviceID', '=', deviceID)
    .execute()
}
