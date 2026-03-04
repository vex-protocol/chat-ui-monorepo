import type { Kysely } from 'kysely'
import type { Database } from '../db/types.js'

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

/** Factory — one store per server instance (never a module singleton). */
export function createTokenStore(): ITokenStore {
  throw new Error('not implemented')
}

export interface PasswordHash {
  hash: string  // hex-encoded 32-byte PBKDF2-SHA512 output
  salt: string  // hex-encoded random salt
}

/** Returns hex-decoded bytes from a hex string. */
export function decodeHex(_hex: string): Uint8Array {
  throw new Error('not implemented')
}

/** Returns lowercase hex string from bytes. */
export function encodeHex(_bytes: Uint8Array): string {
  throw new Error('not implemented')
}

/**
 * Verifies a NaCl Ed25519 signed message and returns the original message bytes,
 * or null if the signature is invalid.
 *
 * Thin wrapper around nacl.sign.open — exported so route handlers can use it
 * without importing tweetnacl directly.
 */
export function verifyNaClSignature(
  _signedMessage: Uint8Array,
  _publicKey: Uint8Array,
): Uint8Array | null {
  throw new Error('not implemented')
}

/** PBKDF2-SHA512, 1000 iterations, 32-byte output. Generates a random salt per call. */
export async function hashPassword(_password: string): Promise<PasswordHash> {
  throw new Error('not implemented')
}

/** Returns true if the password matches the stored hash+salt. */
export async function verifyPassword(
  _password: string,
  _hash: string,
  _salt: string,
): Promise<boolean> {
  throw new Error('not implemented')
}

export interface RegistrationPayload {
  username: string
  password: string
  signKey: string          // hex-encoded NaCl Ed25519 public signing key (64 hex chars)
  signed: string           // hex-encoded NaCl signed message (token UUID bytes signed by device key)
  preKey: string           // hex-encoded medium-term preKey public key
  preKeySignature: string  // hex-encoded NaCl signature of preKey bytes
  preKeyIndex: number
  deviceName: string
}

export interface AuthUser {
  userID: string    // uuid.stringify(regKey) — derived from client NaCl signature, not server-assigned
  username: string
  lastSeen: string  // ISO timestamp
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
  _db: Kysely<Database>,
  _regKey: Uint8Array,
  _payload: RegistrationPayload,
): Promise<AuthUser> {
  throw new Error('not implemented')
}

/**
 * Returns a signed JWT (7-day expiry) with payload { user: { userID, username, lastSeen } },
 * or null if credentials are invalid.
 *
 * Payload follows the censoredUser pattern — passwordHash and passwordSalt are never included.
 */
export async function loginUser(
  _db: Kysely<Database>,
  _username: string,
  _password: string,
): Promise<string | null> {
  throw new Error('not implemented')
}
