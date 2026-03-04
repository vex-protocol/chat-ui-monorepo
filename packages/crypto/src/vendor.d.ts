declare module 'ed2curve' {
  interface Ed2Curve {
    /** Converts an Ed25519 public key to a Curve25519 public key. Returns null if the key is invalid. */
    convertPublicKey(pk: Uint8Array): Uint8Array | null
    /** Converts an Ed25519 secret key to a Curve25519 secret key. */
    convertSecretKey(sk: Uint8Array): Uint8Array
    /** Converts an Ed25519 key pair to a Curve25519 key pair. Returns null if the public key is invalid. */
    convertKeyPair(
      edKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array },
    ): { publicKey: Uint8Array; secretKey: Uint8Array } | null
  }

  const ed2curve: Ed2Curve
  export default ed2curve
}
