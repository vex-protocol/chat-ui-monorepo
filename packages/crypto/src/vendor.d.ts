declare module 'ed2curve' {
  interface CurveKeyPair {
    publicKey: Uint8Array
    secretKey: Uint8Array
  }
  /** Converts an Ed25519 public key to a Curve25519 public key. Returns null if the key is invalid. */
  export function convertPublicKey(pk: Uint8Array): Uint8Array | null
  /** Converts an Ed25519 secret key to a Curve25519 secret key. */
  export function convertSecretKey(sk: Uint8Array): Uint8Array
  /** Converts an Ed25519 key pair to a Curve25519 key pair. Returns null if the public key is invalid. */
  export function convertKeyPair(edKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array }): CurveKeyPair | null
}
