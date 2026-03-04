import type { Request, Response, NextFunction } from 'express'
import { verifyJWT } from '#auth/auth.service.js'
import { AuthError } from '#errors'

/** Parse the raw Cookie header into a key-value map. */
function parseCookieHeader(header: string | undefined): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').flatMap(pair => {
      const idx = pair.indexOf('=')
      if (idx === -1) return []
      const key = pair.slice(0, idx).trim()
      const val = pair.slice(idx + 1).trim()
      return [[key, val]]
    }),
  )
}

/**
 * Verifies the JWT from the `token` cookie or `Authorization: Bearer` header.
 * Sets req.user on success; calls next(AuthError) on failure.
 */
export async function checkAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const cookies = parseCookieHeader(req.headers.cookie)
  const raw = cookies['token'] ?? req.headers.authorization?.replace(/^Bearer\s+/i, '')

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
