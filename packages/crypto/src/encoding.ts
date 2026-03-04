/** Returns hex-decoded bytes from a hex string. */
export function decodeHex(hex: string): Uint8Array {
  return new Uint8Array(Buffer.from(hex, 'hex'))
}

/** Returns lowercase hex string from bytes. */
export function encodeHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex')
}
