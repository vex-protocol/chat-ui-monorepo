/**
 * A decrypted mail message — the type apps work with.
 * Produced by SessionManager.decrypt() inside @vex-chat/libvex.
 * Apps never see the raw IMail wire format.
 */
export interface DecryptedMail {
  mailID: string
  authorID: string      // userID of sender
  readerID: string      // userID of recipient
  group: string | null  // channelID for group messages, null for DMs
  mailType: string
  time: string          // ISO timestamp
  content: string       // plaintext message body
  extra: string | null
  forward: string | null
}

/**
 * A mail message in wire format.
 * The server relays ciphertext only — it never sees plaintext.
 */
export interface IMail {
  nonce: string
  recipient: string          // deviceID of recipient
  mailID: string
  sender: string             // deviceID of sender
  header: string             // encrypted header
  cipher: string             // encrypted body (ciphertext)
  group: string | null
  extra: string | null
  mailType: string
  time: string               // ISO timestamp
  forward: string | null
  authorID: string
  readerID: string
}
