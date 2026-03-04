/** A device as returned to clients — no `deleted` field. */
export interface IDevice {
  deviceID: string
  signKey: string          // 64 hex chars — NaCl Ed25519 public signing key
  owner: string            // userID
  name: string
  lastLogin: string | null // ISO timestamp
}

/** Payload sent by a client to register a new device. */
export interface IDevicePayload {
  signKey: string
  preKey: string
  preKeySignature: string
  preKeyIndex: number
  deviceName: string
}

/** A pre-key (medium-term signed DH key) as used in X3DH. */
export interface IPreKey {
  publicKey: string
  signature: string
  index: number
}

/** A one-time key (single-use DH key) as used in X3DH. */
export interface IOneTimeKey {
  publicKey: string
  signature: string
  index: number
}

/** The key bundle returned to a sender during X3DH key exchange. */
export interface IKeyBundle {
  signKey: string
  preKey: IPreKey
  otk: IOneTimeKey | null
}
