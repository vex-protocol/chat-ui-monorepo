import type { CensoredUser } from '../auth/auth.schemas.js'

declare global {
  namespace Express {
    interface Request {
      user?: CensoredUser
    }
  }
}
