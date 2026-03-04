import nacl from 'tweetnacl'

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
 * Verifies a detached NaCl Ed25519 signature.
 * Uses constant-time comparison — safe against timing attacks.
 */
export function verifyDetached(
  message: Uint8Array,
  signature: Uint8Array,
  publicKey: Uint8Array,
): boolean {
  return nacl.sign.detached.verify(message, signature, publicKey)
}

/**
 * Signs a message with an Ed25519 secret key, returning the signed message
 * (signature prepended to the message bytes).
 */
export function signMessage(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return nacl.sign(message, secretKey)
}

/**
 * Produces a detached Ed25519 signature over message with secretKey.
 * The signature is 64 bytes; the original message is not included.
 */
export function signDetached(message: Uint8Array, secretKey: Uint8Array): Uint8Array {
  return nacl.sign.detached(message, secretKey)
}

/**
 * Generates a new Ed25519 signing key pair.
 * The secret key must never leave the client device.
 */
export function generateSignKeyPair(): nacl.SignKeyPair {
  return nacl.sign.keyPair()
}
