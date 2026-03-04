import { z } from 'zod'

/** Auth handshake sent by client after receiving the challenge. */
export const AuthMessageSchema = z.object({
  type: z.literal('auth'),
  deviceID: z.string().uuid(),
  /** Ed25519 detached signature of the 32-byte challenge, hex-encoded. */
  signature: z.string().regex(/^[0-9a-f]+$/),
})

/** Inbound mail message sent by an authenticated client. */
export const MailMessageSchema = z.object({
  resource: z.literal('mail'),
}).passthrough()

/** All inbound message types from authenticated clients. */
export const InboundMessageSchema = z.discriminatedUnion('resource', [
  MailMessageSchema,
])

export type AuthMessage = z.infer<typeof AuthMessageSchema>
export type MailMessage = z.infer<typeof MailMessageSchema>
export type InboundMessage = z.infer<typeof InboundMessageSchema>
