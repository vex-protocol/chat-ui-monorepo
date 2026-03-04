import argon2 from 'argon2'
export { decodeHex, encodeHex, verifyNaClSignature } from '@vex-chat/crypto'

// argon2id parameters per OWASP 2025 recommendation (m=19MiB, t=2, p=1)
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19 * 1024, // 19 MiB
  timeCost: 2,
  parallelism: 1,
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
