import type { Request, Response, NextFunction } from 'express'
import { verifyJWT } from '#auth/auth.service.js'
import { AuthError } from '#errors'

/**
 * Verifies the JWT from the `token` cookie or `Authorization: Bearer` header.
 * Sets req.user on success; calls next(AuthError) on failure.
 *
 * Requires cookie-parser middleware upstream (app.ts uses cookieParser()).
 */
export async function checkAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const raw = (req.cookies['token'] as string | undefined) ?? req.headers.authorization?.replace(/^Bearer\s+/i, '')

  if (!raw) {
    next(new AuthError())
    return
  }

  const user = await verifyJWT(raw)
  if (!user) {
    next(new AuthError())
    return
  }

  req.user = user
  next()
}
