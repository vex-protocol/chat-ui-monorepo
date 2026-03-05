/**
 * Conversation fingerprint — a human-comparable safety number derived
 * from both parties' Ed25519 identity keys.
 *
 * Similar to Signal's safety numbers: deterministic, order-independent,
 * and suitable for out-of-band verification (e.g. comparing on a phone call).
 *
 * Uses SHA-256 of the sorted concatenation of both 32-byte public keys.
 * Formatted as space-separated 4-char hex blocks for readability.
 */
import { sha256 } from '@noble/hashes/sha256'
import { encodeHex, decodeHex } from './encoding.ts'

/**
 * Computes a conversation fingerprint from two Ed25519 public keys.
 * The result is order-independent: f(A, B) === f(B, A).
 *
 * @param pubKeyA - Hex-encoded Ed25519 public key (64 hex chars / 32 bytes)
 * @param pubKeyB - Hex-encoded Ed25519 public key (64 hex chars / 32 bytes)
 * @returns Formatted fingerprint string, e.g. "a1b2 c3d4 e5f6 ..."
 */
export function computeFingerprint(pubKeyA: string, pubKeyB: string): string {
  const a = decodeHex(pubKeyA)
  const b = decodeHex(pubKeyB)

  // Sort lexicographically so the result is order-independent
  const [first, second] = compareBytes(a, b) <= 0 ? [a, b] : [b, a]

  const combined = new Uint8Array(first.length + second.length)
  combined.set(first)
  combined.set(second, first.length)

  const hash = sha256(combined)
  return formatFingerprint(encodeHex(hash))
}

/** Lexicographic byte comparison. */
function compareBytes(a: Uint8Array, b: Uint8Array): number {
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) {
    if (a[i]! !== b[i]!) return a[i]! - b[i]!
  }
  return a.length - b.length
}

/**
 * Formats a hex string as space-separated 4-char blocks.
 * Uses first 32 hex chars (16 bytes) for a readable fingerprint.
 */
function formatFingerprint(hex: string): string {
  const truncated = hex.slice(0, 32).toUpperCase()
  const blocks: string[] = []
  for (let i = 0; i < truncated.length; i += 4) {
    blocks.push(truncated.slice(i, i + 4))
  }
  return blocks.join(' ')
}
