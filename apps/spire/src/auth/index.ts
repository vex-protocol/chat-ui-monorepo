import crypto from 'node:crypto'
import { promisify } from 'node:util'
import nacl from 'tweetnacl'
import { SignJWT } from 'jose'
import { v4 as uuidv4, stringify as uuidStringify } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database } from '../db/types.js'
import { ConflictError, ValidationError } from '../errors.js'
import type { RegistrationPayload, CensoredUser } from './schemas.js'
export type { RegistrationPayload, CensoredUser } from './schemas.js'
export { RegistrationPayloadSchema, LoginBodySchema, CensoredUserSchema } from './schemas.js'

const pbkdf2 = promisify(crypto.pbkdf2)
const TOKEN_EXPIRY = 10 * 60 * 1000 // 10 minutes in ms

// ---------------------------------------------------------------------------
// Token types
// ---------------------------------------------------------------------------

export type TokenType = 'file' | 'avatar' | 'register' | 'device' | 'invite' | 'emoji' | 'connect'

export interface IActionToken {
  key: string    // UUID v4 string
  scope: TokenType
  time: Date
}

export interface ITokenStore {
  /** Creates a single-use action token with a 10-minute TTL. */
  create(scope: TokenType): IActionToken
  /**
   * Validates and consumes a token. Returns true exactly once for a valid,
   * unexpired token of the correct scope. Returns false for wrong scope,
   * expired (>10 min), already-consumed, or unknown tokens.
   */
  validate(key: string, scope: TokenType): boolean
}

// ---------------------------------------------------------------------------
// Hex utilities
// ---------------------------------------------------------------------------

/** Returns hex-decoded bytes from a hex string. */
export function decodeHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'))
}

/** Returns lowercase hex string from bytes. */
export function encodeHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex')
}

// ---------------------------------------------------------------------------
// NaCl
// ---------------------------------------------------------------------------

/**
 * Verifies a NaCl Ed25519 signed message and returns the original message bytes,
 * or null if the signature is invalid.
 *
 * Thin wrapper around nacl.sign.open — exported so route handlers can use it
 * without importing tweetnacl directly.
 */
export function verifyNaClSignature(
  signedMessage: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array | null {
  return nacl.sign.open(signedMessage, publicKey)
}

// ---------------------------------------------------------------------------
// Token store
// ---------------------------------------------------------------------------

/** Factory — one store per server instance (never a module singleton). */
export function createTokenStore(): ITokenStore {
  const store = new Map<string, IActionToken>()

  // Sweep expired tokens every 5 minutes to prevent unbounded Map growth.
  // .unref() ensures this timer never keeps the Node.js process alive on its own —
  // critical for clean test teardown and graceful shutdown.
  const sweep = setInterval(() => {
    const cutoff = Date.now() - TOKEN_EXPIRY
    for (const [key, token] of store) {
      if (token.time.getTime() < cutoff) store.delete(key)
    }
  }, 5 * 60 * 1000)
  sweep.unref()

  return {
    create(scope: TokenType): IActionToken {
      const token: IActionToken = { key: uuidv4(), scope, time: new Date() }
      store.set(token.key, token)
      return token
    },

    validate(key: string, scope: TokenType): boolean {
      const token = store.get(key)
      if (!token) return false
      if (token.scope !== scope) return false
      if (Date.now() - token.time.getTime() > TOKEN_EXPIRY) {
        store.delete(key) // lazy expiry: sweep may not have run yet
        return false
      }
      store.delete(key) // single-use: consumed on first valid use
      return true
    },
  }
}

// ---------------------------------------------------------------------------
// Password hashing
// ---------------------------------------------------------------------------

export interface PasswordHash {
  hash: string  // hex-encoded 32-byte PBKDF2-SHA512 output
  salt: string  // hex-encoded random salt
}

/** PBKDF2-SHA512, 1000 iterations, 32-byte output. Generates a random salt per call. */
export async function hashPassword(password: string): Promise<PasswordHash> {
  const saltBytes = crypto.randomBytes(16)
  const hashBytes = await pbkdf2(password, saltBytes, 1000, 32, 'sha512')
  return {
    hash: hashBytes.toString('hex'),
    salt: saltBytes.toString('hex'),
  }
}

/** Returns true if the password matches the stored hash+salt. */
export async function verifyPassword(
  password: string,
  hash: string,
  salt: string,
): Promise<boolean> {
  const saltBytes = Buffer.from(salt, 'hex')
  const hashBytes = await pbkdf2(password, saltBytes, 1000, 32, 'sha512')
  const expected = Buffer.from(hash, 'hex')
  if (hashBytes.length !== expected.length) return false
  return crypto.timingSafeEqual(hashBytes, expected)
}

// ---------------------------------------------------------------------------
// Auth types
// ---------------------------------------------------------------------------

export interface AuthUser {
  userID: string    // uuid.stringify(regKey) — derived from client NaCl signature, not server-assigned
  username: string
  lastSeen: string  // ISO timestamp
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function censorUser(row: { userID: string; username: string; lastSeen: string }): CensoredUser {
  return { userID: row.userID, username: row.username, lastSeen: row.lastSeen }
}

function jwtSecret(): Uint8Array {
  return new TextEncoder().encode(process.env['JWT_SECRET'] ?? 'dev-secret-change-in-production')
}

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------

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
  const { hash: passwordHash, salt: passwordSalt } = await hashPassword(payload.password)
  const deviceID = uuidv4()
  const now = new Date().toISOString()

  try {
    await db.transaction().execute(async trx => {
      await trx
        .insertInto('users')
        .values({ userID, username: payload.username, passwordHash, passwordSalt, lastSeen: now })
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

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------

/**
 * Returns a signed JWT (7-day expiry) with payload { user: { userID, username, lastSeen } },
 * or null if credentials are invalid.
 *
 * Payload follows the censoredUser pattern — passwordHash and passwordSalt are never included.
 */
export async function loginUser(
  db: Kysely<Database>,
  username: string,
  password: string,
): Promise<string | null> {
  const row = await db
    .selectFrom('users')
    .where('username', '=', username)
    .selectAll()
    .executeTakeFirst()

  if (!row) return null

  const valid = await verifyPassword(password, row.passwordHash, row.passwordSalt)
  if (!valid) return null

  const token = await new SignJWT({ user: censorUser(row) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(jwtSecret())

  return token
}
