import argon2 from 'argon2'
import nacl from 'tweetnacl'

// argon2id parameters per OWASP 2025 recommendation (m=19MiB, t=2, p=1)
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024, // 19 MiB
  timeCost: 2,
  parallelism: 1,
}

/** Returns hex-decoded bytes from a hex string. */
export function decodeHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'))
}

/** Returns lowercase hex string from bytes. */
export function encodeHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex')
}

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

/**
 * Hashes a password with argon2id (OWASP 2025 recommended: m=19MiB, t=2, p=1).
 * Returns the PHC format string, which embeds the salt, algorithm, and parameters.
 */
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS)
}

/** Returns true if the password matches the stored argon2id hash. */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return argon2.verify(hash, password)
}
