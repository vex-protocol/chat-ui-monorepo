import type { CensoredUser } from './auth/auth.schemas.ts'

declare global {
  namespace Express {
    interface Request {
      user?: CensoredUser
    }
  }
}
