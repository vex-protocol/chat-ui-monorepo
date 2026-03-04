/**
 * Session crypto for X3DH key exchange.
 * Used by libvex clients — not used by the spire server.
 *
 * All functions use @noble/curves (Ed25519 + X25519) and @noble/hashes (HKDF-SHA256).
 * Both packages are pure ESM with bundled TypeScript types.
 */
import { ed25519, x25519 } from '@noble/curves/ed25519'
import { hkdf } from '@noble/hashes/hkdf'
import { sha256 } from '@noble/hashes/sha256'

/** Converts an Ed25519 public key (32 bytes) to a Curve25519/X25519 public key. */
export function convertPublicKey(ed25519PublicKey: Uint8Array): Uint8Array {
  return ed25519.utils.toMontgomery(ed25519PublicKey)
}

/** Converts an Ed25519 private key seed (32 bytes) to a Curve25519/X25519 private key. */
export function convertSecretKey(ed25519PrivateKey: Uint8Array): Uint8Array {
  return ed25519.utils.toMontgomerySecret(ed25519PrivateKey)
}

/** Converts an Ed25519 key pair to a Curve25519/X25519 key pair. */
export function convertKeyPair(edKeyPair: {
  publicKey: Uint8Array
  secretKey: Uint8Array
}): { publicKey: Uint8Array; secretKey: Uint8Array } {
  return {
    publicKey: ed25519.utils.toMontgomery(edKeyPair.publicKey),
    secretKey: ed25519.utils.toMontgomerySecret(edKeyPair.secretKey),
  }
}

/**
 * Generates a new X25519 DH key pair for ephemeral use in X3DH.
 */
export function generateDHKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  const secretKey = x25519.utils.randomSecretKey()
  const publicKey = x25519.getPublicKey(secretKey)
  return { publicKey, secretKey }
}

/**
 * Performs a Curve25519/X25519 Diffie-Hellman exchange.
 * Returns the 32-byte shared secret.
 */
export function dh(mySecretKey: Uint8Array, theirPublicKey: Uint8Array): Uint8Array {
  return x25519.getSharedSecret(mySecretKey, theirPublicKey)
}

/**
 * Derives a symmetric key from input key material using HKDF-SHA256.
 *
 * @param ikm    - Input key material (e.g. concatenated DH outputs from X3DH)
 * @param length - Output key length in bytes (default 32)
 * @param info   - Application-specific context string
 * @param salt   - Optional salt; defaults to 32 zero bytes if omitted
 */
export function deriveSessionKey(
  ikm: Uint8Array,
  length = 32,
  info = 'vex-chat-session',
  salt?: Uint8Array,
): Uint8Array {
  const infoBytes = new TextEncoder().encode(info)
  const saltBytes = salt ?? new Uint8Array(32)
  return hkdf(sha256, ikm, saltBytes, infoBytes, length)
}
