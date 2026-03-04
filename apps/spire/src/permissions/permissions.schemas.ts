import { z } from 'zod'

export const CreatePermissionSchema = z.object({
  userID: z.string().uuid(),
  resourceType: z.string(),
  resourceID: z.string().uuid(),
  powerLevel: z.number().int(),
})

export type CreatePermission = z.infer<typeof CreatePermissionSchema>
