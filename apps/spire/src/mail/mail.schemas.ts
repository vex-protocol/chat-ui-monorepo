import { z } from 'zod'

/** A mail message as sent by a client and stored on the server. */
export const MailPayloadSchema = z.object({
  nonce: z.string(),
  recipient: z.string(), // deviceID of recipient
  mailID: z.string(),
  sender: z.string(),    // deviceID of sender
  header: z.string(),    // encrypted header
  cipher: z.string(),    // encrypted body (ciphertext only — server never sees plaintext)
  group: z.string().nullable().optional(),
  extra: z.string().nullable().optional(),
  mailType: z.string(),
  time: z.string(),      // ISO timestamp
  forward: z.string().nullable().optional(),
  authorID: z.string(),
  readerID: z.string(),
})

export type MailPayload = z.infer<typeof MailPayloadSchema>
