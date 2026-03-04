/**
 * Test factories for domain objects.
 *
 * All factories are stub-independent — they use nacl and uuid directly
 * rather than calling src/ service stubs. This means factory setup never
 * fails with "not implemented", so test failures are always at the
 * assertion level rather than the setup level.
 */
import type { Kysely } from 'kysely'
import nacl from 'tweetnacl'
import { parse as uuidParse, v4 as uuidv4 } from 'uuid'
import type { Database } from '#db/types.ts'
import type { IActionToken, RegistrationPayload } from '#auth/auth.service.ts'
import type { DevicePayload } from '#devices/devices.service.ts'

/** Lowercase hex encode — avoids depending on auth stubs. */
function hexEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex')
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

/**
 * Inserts a bare user row via direct DB write — no auth stub dependency.
 * Use this in non-auth test files (devices, mail, etc.) to create an owner.
 * Returns the userID.
 */
export async function seedUser(
  db: Kysely<Database>,
  userID = uuidv4(),
): Promise<string> {
  // username: 'u' + 11 hex chars = 12 chars, matches /^\w{3,19}$/
  const username = 'u' + userID.replace(/-/g, '').slice(0, 11)
  await db
    .insertInto('users')
    .values({
      userID,
      username,
      passwordHash: 'a'.repeat(64),
      lastSeen: new Date().toISOString(),
    })
    .execute()
  return userID
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

/**
 * Builds a valid registration payload for a given token and device key pair.
 * regKey is the verified NaCl bytes (what the server gets after nacl.sign.open).
 *
 * Uses nacl.sign.open directly rather than the verifyNaClSignature stub, so
 * this helper works even before auth is implemented.
 */
export function makeRegistrationPayload(
  token: IActionToken,
  keyPair: nacl.SignKeyPair,
  overrides?: Partial<RegistrationPayload>,
): { regKey: Uint8Array; payload: RegistrationPayload } {
  const tokenBytes = uuidParse(token.key) as Uint8Array
  const signedMessage = nacl.sign(tokenBytes, keyPair.secretKey)
  const preKeyPair = nacl.sign.keyPair()
  const preKeySignature = nacl.sign(preKeyPair.publicKey, keyPair.secretKey)
  const regKey = nacl.sign.open(signedMessage, keyPair.publicKey)!

  return {
    regKey,
    payload: {
      username: 'alice',
      password: 'password123',
      signKey: hexEncode(keyPair.publicKey),
      signed: hexEncode(signedMessage),
      preKey: hexEncode(preKeyPair.publicKey),
      preKeySignature: hexEncode(preKeySignature),
      preKeyIndex: 0,
      deviceName: 'test-device',
      ...overrides,
    },
  }
}

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

/**
 * Inserts a bare device row via direct DB write — no preKey inserted.
 * Use this when you need a device with no pre-key (e.g. to test null returns).
 * Returns { deviceID, signKey }.
 */
export async function seedDevice(
  db: Kysely<Database>,
  userID: string,
): Promise<{ deviceID: string; signKey: string }> {
  const deviceID = uuidv4()
  const signKey = hexEncode(nacl.sign.keyPair().publicKey)
  await db
    .insertInto('devices')
    .values({ deviceID, signKey, owner: userID, name: 'test-device', lastLogin: null, deleted: 0 })
    .execute()
  return { deviceID, signKey }
}

/**
 * Builds a valid device payload with a fresh NaCl key pair.
 * Used when adding a device to an existing user.
 */
export function makeDevicePayload(overrides?: Partial<DevicePayload>): DevicePayload {
  const kp = nacl.sign.keyPair()
  const preKeyPair = nacl.sign.keyPair()
  const preKeySig = nacl.sign(preKeyPair.publicKey, kp.secretKey)
  return {
    signKey: hexEncode(kp.publicKey),
    preKey: hexEncode(preKeyPair.publicKey),
    preKeySignature: hexEncode(preKeySig),
    preKeyIndex: 0,
    deviceName: 'test-device',
    ...overrides,
  }
}
