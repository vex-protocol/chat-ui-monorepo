/** A user as returned to clients — no passwordHash. */
export interface IUser {
  userID: string
  username: string
  lastSeen: string  // ISO timestamp
}

/** Payload sent by a client to register a new user + device. */
export interface IRegistrationPayload {
  username: string
  password: string
  signKey: string          // 64 hex chars — NaCl Ed25519 public signing key
  signed: string           // token signed with device key
  preKey: string
  preKeySignature: string
  preKeyIndex: number
  deviceName: string
}

/** Payload sent by a client to authenticate. */
export interface ILoginBody {
  username: string
  password: string
}
