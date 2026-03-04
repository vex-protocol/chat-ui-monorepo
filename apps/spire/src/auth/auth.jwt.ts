import { SignJWT, jwtVerify } from 'jose'
import type { CensoredUser } from './auth.schemas.js'
import { JWTPayloadSchema } from './auth.schemas.js'

function encodeSecret(jwtSecret: string): Uint8Array {
  return new TextEncoder().encode(jwtSecret)
}

/**
 * Issues a signed JWT (7-day expiry) directly from a CensoredUser object.
 * Use this after registration (user is already authenticated — no re-verify needed).
 */
export async function issueJWT(user: CensoredUser, jwtSecret: string): Promise<string> {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encodeSecret(jwtSecret))
}

/**
 * Verifies a JWT and returns the censored user payload, or null if invalid.
 */
export async function verifyJWT(token: string, jwtSecret: string): Promise<CensoredUser | null> {
  try {
    const { payload } = await jwtVerify(token, encodeSecret(jwtSecret))
    const parsed = JWTPayloadSchema.safeParse(payload)
    return parsed.success ? parsed.data.user : null
  } catch {
    return null
  }
}
