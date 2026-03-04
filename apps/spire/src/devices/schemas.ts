import { z } from 'zod'

export const DevicePayloadSchema = z.object({
  signKey: z.string().regex(/^[0-9a-f]{64}$/, 'signKey must be 64 lowercase hex chars'),
  preKey: z.string(),
  preKeySignature: z.string(),
  preKeyIndex: z.number().int().nonnegative(),
  deviceName: z.string().min(1),
})

export const DeviceSchema = z.object({
  deviceID: z.string().uuid(),
  signKey: z.string(),
  owner: z.string().uuid(),
  name: z.string(),
  lastLogin: z.string().nullable(),
  deleted: z.number().int(),
})

// Derive TypeScript types from Zod schemas — single source of truth, no drift.
export type DevicePayload = z.infer<typeof DevicePayloadSchema>
export type Device = z.infer<typeof DeviceSchema>
