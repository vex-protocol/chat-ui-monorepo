import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import pinoHttp from 'pino-http'
import cookieParser from 'cookie-parser'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import type { ITokenStore } from '#auth/auth.token-store.ts'
import { createAuthRouter } from './auth/auth.routes.ts'
import { createUserRouter } from './users/users.routes.ts'
import { createDeviceRouter } from './devices/devices.routes.ts'
import { createServerRouter } from './servers/servers.routes.ts'
import { errorMiddleware } from './middleware/error.ts'
import { createCheckAuth } from './middleware/checkAuth.ts'
import { NotFoundError } from '#errors'

const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 500,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
})

const httpLogger = pinoHttp({
  serializers: {
    req(req) {
      return { method: req.method, url: req.url }
    },
    res(res) {
      return { statusCode: res.statusCode }
    },
  },
})

/**
 * Creates the Express application.
 *
 * Accepts db and tokenStore as dependencies so tests can inject in-memory
 * instances without touching disk or environment.
 */
export function createApp(
  db: Kysely<Database>,
  tokenStore: ITokenStore,
  jwtSecret: string,
  openRegistration = false,
): express.Application {
  const app = express()
  const checkAuth = createCheckAuth(jwtSecret)

  app.use(helmet())
  app.use(cors({ credentials: true }))
  app.use(express.json())
  app.use(cookieParser())
  app.use(globalRateLimit)
  app.use(httpLogger)

  app.use(createAuthRouter(db, tokenStore, jwtSecret, openRegistration))
  app.use(createUserRouter(db, checkAuth))
  app.use(createDeviceRouter(db, checkAuth))
  app.use(createServerRouter(db, checkAuth))

  app.use((_req, _res, next) => next(new NotFoundError()))
  app.use(errorMiddleware)

  return app
}
