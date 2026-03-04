import { z } from 'zod'

export const CreateInviteSchema = z.object({
  serverID: z.string().uuid(),
  owner: z.string().uuid(),
  expiration: z.string().datetime().nullable(),
})

export type CreateInvite = z.infer<typeof CreateInviteSchema>
