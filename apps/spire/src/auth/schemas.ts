import { z } from 'zod'

export const RegistrationPayloadSchema = z.object({
  username: z.string().regex(/^\w{3,19}$/, 'username must be 3–19 word characters'),
  password: z.string(),
  signKey: z.string().regex(/^[0-9a-f]{64}$/, 'signKey must be 64 lowercase hex chars'),
  signed: z.string(),
  preKey: z.string(),
  preKeySignature: z.string(),
  preKeyIndex: z.number().int().nonnegative(),
  deviceName: z.string().min(1),
})

export const LoginBodySchema = z.object({
  username: z.string(),
  password: z.string(),
})

export const CensoredUserSchema = z.object({
  userID: z.string().uuid(),
  username: z.string(),
  lastSeen: z.string(),
})

export const JWTPayloadSchema = z.object({
  user: CensoredUserSchema,
  iat: z.number(),
  exp: z.number(),
})

export type RegistrationPayload = z.infer<typeof RegistrationPayloadSchema>
export type LoginBody = z.infer<typeof LoginBodySchema>
export type CensoredUser = z.infer<typeof CensoredUserSchema>
export type JWTPayload = z.infer<typeof JWTPayloadSchema>
