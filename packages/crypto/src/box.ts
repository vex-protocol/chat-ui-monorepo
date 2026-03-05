/**
 * Symmetric authenticated encryption (NaCl secretbox semantics).
 * Uses XSalsa20-Poly1305 via @noble/ciphers.
 *
 * Used by SessionManager in @vex-chat/libvex to encrypt/decrypt mail bodies.
 */
import { xsalsa20poly1305 } from '@noble/ciphers/salsa'

/**
 * Generates a cryptographically random 24-byte nonce.
 * Suitable for XSalsa20-Poly1305 (NaCl secretbox nonce size).
 */
export function generateNonce(): Uint8Array {
  return globalThis.crypto.getRandomValues(new Uint8Array(24))
}

/**
 * Encrypts `message` using XSalsa20-Poly1305 (NaCl secretbox).
 * Returns ciphertext with the 16-byte Poly1305 MAC prepended.
 *
 * @param message - Plaintext bytes
 * @param nonce   - 24-byte nonce (must be unique per (key, message) pair)
 * @param key     - 32-byte symmetric key
 */
export function encryptSecretBox(
  message: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array,
): Uint8Array {
  return xsalsa20poly1305(key, nonce).encrypt(message)
}

/**
 * Decrypts and authenticates `ciphertext` using XSalsa20-Poly1305.
 * Returns the plaintext, or null if authentication fails or the input is malformed.
 *
 * @param ciphertext - Authenticated ciphertext (MAC prepended, as returned by encryptSecretBox)
 * @param nonce      - 24-byte nonce used during encryption
 * @param key        - 32-byte symmetric key
 */
export function decryptSecretBox(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array,
): Uint8Array | null {
  try {
    return xsalsa20poly1305(key, nonce).decrypt(ciphertext)
  } catch {
    return null
  }
}
