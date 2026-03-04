import type { Request, Response, NextFunction, RequestHandler } from 'express'
import { verifyJWT } from '#auth/auth.jwt.js'
import { AuthError } from '#errors'

/**
 * Returns a middleware that verifies the JWT from the `token` cookie or
 * `Authorization: Bearer` header, using the provided jwtSecret.
 * Sets req.user on success; calls next(AuthError) on failure.
 *
 * Requires cookie-parser middleware upstream (app.ts uses cookieParser()).
 */
export function createCheckAuth(jwtSecret: string): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const raw = (req.cookies['token'] as string | undefined) ?? req.headers.authorization?.replace(/^Bearer\s+/i, '')

    if (!raw) {
      next(new AuthError())
      return
    }

    const user = await verifyJWT(raw, jwtSecret)
    if (!user) {
      next(new AuthError())
      return
    }

    req.user = user
    next()
  }
}
