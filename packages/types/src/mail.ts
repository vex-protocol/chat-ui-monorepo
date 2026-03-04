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
