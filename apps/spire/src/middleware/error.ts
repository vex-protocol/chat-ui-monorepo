import type { Request, Response, NextFunction } from 'express'
import { ConflictError, ValidationError, NotFoundError, AuthError, ForbiddenError } from '#errors'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorMiddleware(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AuthError) {
    res.status(401).json({ error: err.message })
  } else if (err instanceof ForbiddenError) {
    res.status(403).json({ error: err.message })
  } else if (err instanceof ValidationError) {
    res.status(400).json({ error: err.message })
  } else if (err instanceof NotFoundError) {
    res.status(404).json({ error: err.message })
  } else if (err instanceof ConflictError) {
    res.status(409).json({ error: err.message })
  } else {
    res.status(500).json({ error: 'Internal server error' })
  }
}
