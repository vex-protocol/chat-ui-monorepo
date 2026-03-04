import { v4 as uuidv4 } from 'uuid'
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
  db: Kysely<Database>,
  userID: string,
  deviceID: string,
  publicKey: string,
  signature: string,
  index: number,
): Promise<void> {
  await db
    .insertInto('preKeys')
    .values({ keyID: uuidv4(), userID, deviceID, publicKey, signature, index })
    .onConflict(oc => oc.column('deviceID').doUpdateSet({ publicKey, signature, index }))
    .execute()
}

/**
 * Returns the pre-key for a device, or null if not found.
 */
export async function getPreKey(
  db: Kysely<Database>,
  deviceID: string,
): Promise<{ keyID: string; publicKey: string; signature: string; index: number } | null> {
  const row = await db
    .selectFrom('preKeys')
    .where('deviceID', '=', deviceID)
    .select(['keyID', 'publicKey', 'signature', 'index'])
    .executeTakeFirst()

  return row ?? null
}

/**
 * Batch-inserts one-time keys for a device.
 */
export async function saveOTKs(
  db: Kysely<Database>,
  userID: string,
  deviceID: string,
  keys: OTKPayload[],
): Promise<void> {
  if (keys.length === 0) return

  await db
    .insertInto('oneTimeKeys')
    .values(keys.map(k => ({ keyID: uuidv4(), userID, deviceID, ...k })))
    .execute()
}

/**
 * Returns the one-time key with the lowest index for a device, atomically
 * deletes it, and returns it. Returns null if no OTKs remain.
 */
export async function consumeOTK(
  db: Kysely<Database>,
  deviceID: string,
): Promise<{ publicKey: string; signature: string; index: number } | null> {
  return db.transaction().execute(async trx => {
    const row = await trx
      .selectFrom('oneTimeKeys')
      .where('deviceID', '=', deviceID)
      .orderBy('index', 'asc')
      .limit(1)
      .select(['keyID', 'publicKey', 'signature', 'index'])
      .executeTakeFirst()

    if (!row) return null

    await trx.deleteFrom('oneTimeKeys').where('keyID', '=', row.keyID).execute()

    return { publicKey: row.publicKey, signature: row.signature, index: row.index }
  })
}

/**
 * Returns the count of remaining one-time keys for a device.
 */
export async function getOTKCount(
  db: Kysely<Database>,
  deviceID: string,
): Promise<number> {
  const { count } = await db
    .selectFrom('oneTimeKeys')
    .where('deviceID', '=', deviceID)
    .select(eb => eb.fn.countAll<number>().as('count'))
    .executeTakeFirstOrThrow()

  return Number(count)
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
  db: Kysely<Database>,
  deviceID: string,
): Promise<KeyBundle | null> {
  const device = await db
    .selectFrom('devices')
    .where('deviceID', '=', deviceID)
    .select('signKey')
    .executeTakeFirst()

  if (!device) return null

  const preKey = await getPreKey(db, deviceID)
  if (!preKey) return null

  const otk = await consumeOTK(db, deviceID)

  return { signKey: device.signKey, preKey, otk }
}
