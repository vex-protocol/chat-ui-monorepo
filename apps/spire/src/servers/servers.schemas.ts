import { z } from 'zod'

export const CreateServerSchema = z.object({
  name: z.string().min(1),
  icon: z.string().min(1),
})

export const CreateChannelSchema = z.object({
  serverID: z.string().uuid(),
  name: z.string().min(1),
})

export type CreateServerPayload = z.infer<typeof CreateServerSchema>
export type CreateChannelPayload = z.infer<typeof CreateChannelSchema>
