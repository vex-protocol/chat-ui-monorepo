import { z } from 'zod'

export const CreateFileSchema = z.object({
  owner: z.string().uuid(),
  nonce: z.string(),
})

export const CreateEmojiSchema = z.object({
  owner: z.string().uuid(),
  name: z.string().min(1),
})

export type CreateFile = z.infer<typeof CreateFileSchema>
export type CreateEmoji = z.infer<typeof CreateEmojiSchema>
