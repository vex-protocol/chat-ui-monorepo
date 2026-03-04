import { ed25519 } from '@noble/curves/ed25519'

/**
 * Verifies a NaCl-compatible Ed25519 signed message (64-byte signature prepended
 * to the message) and returns the original message bytes, or null if invalid.
 *
 * Wire format: signature (64 bytes) || message
 */
export function verifyNaClSignature(
  signedMessage: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array | null {
  if (signedMessage.length < 64) return null
  const signature = signedMessage.subarray(0, 64)
  const message = signedMessage.subarray(64)
  try {
    return ed25519.verify(signature, message, publicKey) ? message : null
  } catch {
    return null
  }
}

/**
 * Verifies a detached Ed25519 signature.
 * Uses constant-time comparison — safe against timing attacks.
 */
export function verifyDetached(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  try {
    return ed25519.verify(signature, message, publicKey)
  } catch {
    return false
  }
}

/**
 * Signs a message with an Ed25519 secret key, returning the NaCl-compatible
 * signed message: signature (64 bytes) prepended to the original message.
 */
export function signMessage(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  const signature = ed25519.sign(message, secretKey)
  const signed = new Uint8Array(64 + message.length)
  signed.set(signature)
  signed.set(message, 64)
  return signed
}

/**
 * Produces a detached Ed25519 signature (64 bytes) over message with secretKey.
 */
export function signDetached(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return ed25519.sign(message, secretKey)
}

/**
 * Generates a new Ed25519 signing key pair.
 * secretKey is 32 bytes (the seed). publicKey is 32 bytes.
 * The secret key must never leave the client device.
 */
export function generateSignKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
  const secretKey = ed25519.utils.randomPrivateKey()
  const publicKey = ed25519.getPublicKey(secretKey)
  return { publicKey, secretKey }
}
