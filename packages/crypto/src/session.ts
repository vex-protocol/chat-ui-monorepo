/**
 * Session crypto for X3DH key exchange.
 * Used by libvex clients — not used by the spire server.
 *
 * Depends on ed2curve (Ed25519→Curve25519 conversion) and futoin-hkdf (HKDF key derivation).
 */
import nacl from 'tweetnacl'
import ed2curve from 'ed2curve'
import hkdf from 'futoin-hkdf'

// ed2curve is a CJS UMD module — only the default export is available in ESM at runtime.
// Destructure from the default rather than using named imports.
export const convertPublicKey = ed2curve.convertPublicKey.bind(ed2curve)
export const convertSecretKey = ed2curve.convertSecretKey.bind(ed2curve)
export const convertKeyPair = ed2curve.convertKeyPair.bind(ed2curve)

/**
 * Generates a new Curve25519 DH key pair for ephemeral use in X3DH.
 */
export function generateDHKeyPair(): nacl.BoxKeyPair {
  return nacl.box.keyPair()
}

/**
 * Derives a symmetric key from input key material using HKDF-SHA256.
 *
 * @param ikm    - Input key material (e.g. concatenated DH outputs from X3DH)
 * @param length - Output key length in bytes (default 32)
 * @param info   - Application-specific context string
 * @param salt   - Optional salt; defaults to zero-filled buffer if omitted
 */
export function deriveSessionKey(
  ikm: Uint8Array,
  length = 32,
  info = 'vex-chat-session',
  salt?: Uint8Array,
): Uint8Array {
  const result = hkdf(Buffer.from(ikm), length, {
    hash: 'SHA-256',
    info: Buffer.from(info),
    salt: salt ? Buffer.from(salt) : Buffer.alloc(32, 0),
  })
  return new Uint8Array(result)
}

/**
 * Performs a Curve25519 Diffie-Hellman exchange.
 * Returns the 32-byte shared secret.
 */
export function dh(mySecretKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array {
  return nacl.scalarMult(mySecretKey, theirPublicKey)
}
