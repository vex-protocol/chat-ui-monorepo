import { v4 as uuidv4, stringify as uuidStringify } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import { ConflictError, ValidationError } from '#errors'
import { hashPassword, verifyPassword } from './auth.crypto.ts'
import { issueJWT } from './auth.jwt.ts'
import type { RegistrationPayload, CensoredUser } from './auth.schemas.ts'


export interface AuthUser {
  userID: string    // uuid.stringify(regKey) — derived from client NaCl signature, not server-assigned
  username: string
  lastSeen: string  // ISO timestamp
}

function censorUser(row: { userID: string; username: string; lastSeen: string }): CensoredUser {
  return { userID: row.userID, username: row.username, lastSeen: row.lastSeen }
}

/**
 * Creates a user + device + preKey atomically.
 *
 * @param regKey  - Verified NaCl bytes: the result of nacl.sign.open(signed, signKey).
 *                  These are the UUID bytes of the registration token; userID = uuid.stringify(regKey).
 *                  NaCl signature verification is the caller's responsibility (route handler).
 * @param payload - Registration data. Username must match /^\w{3,19}$/.
 *
 * Throws on duplicate username or duplicate signKey.
 */
export async function registerUser(
  db: Kysely<Database>,
  regKey: Uint8Array,
  payload: RegistrationPayload,
): Promise<AuthUser> {
  if (!/^\w{3,19}$/.test(payload.username)) {
    throw new ValidationError(`Invalid username: "${payload.username}"`)
  }

  const userID = uuidStringify(regKey)
  const passwordHash = await hashPassword(payload.password)
  const deviceID = uuidv4()
  const now = new Date().toISOString()

  try {
    await db.transaction().execute(async trx => {
      await trx
        .insertInto('users')
        .values({ userID, username: payload.username, passwordHash, lastSeen: now })
        .execute()

      await trx
        .insertInto('devices')
        .values({
          deviceID,
          signKey: payload.signKey,
          owner: userID,
          name: payload.deviceName,
          lastLogin: null,
          deleted: 0,
        })
        .execute()

      await trx
        .insertInto('preKeys')
        .values({
          keyID: uuidv4(),
          userID,
          deviceID,
          publicKey: payload.preKey,
          signature: payload.preKeySignature,
          index: payload.preKeyIndex,
        })
        .execute()
    })
  } catch (err) {
    if (err instanceof Error && err.message.includes('UNIQUE constraint failed')) {
      throw new ConflictError(err.message)
    }
    throw err
  }

  return { userID, username: payload.username, lastSeen: now }
}

/**
 * Returns a signed JWT (7-day expiry) with payload { user: { userID, username, lastSeen } },
 * or null if credentials are invalid.
 *
 * Payload follows the censoredUser pattern — passwordHash is never included.
 */
export async function loginUser(
  db: Kysely<Database>,
  username: string,
  password: string,
  jwtSecret: string,
): Promise<string | null> {
  const row = await db
    .selectFrom('users')
    .where('username', '=', username)
    .selectAll()
    .executeTakeFirst()

  if (!row) return null

  const valid = await verifyPassword(password, row.passwordHash)
  if (!valid) return null

  return issueJWT(censorUser(row), jwtSecret)
}
