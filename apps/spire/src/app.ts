import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import pinoHttp from 'pino-http'
import cookieParser from 'cookie-parser'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'
import type { ITokenStore } from '#auth/auth.service.js'
import { createAuthRouter } from './routes/auth.js'
import { createUserRouter } from './routes/users.js'
import { createDeviceRouter } from './routes/devices.js'
import { createServerRouter } from './routes/servers.js'
import { errorMiddleware } from './middleware/error.js'
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
): express.Application {
  const app = express()

  app.use(helmet())
  app.use(cors({ credentials: true }))
  app.use(express.json())
  app.use(cookieParser())
  app.use(globalRateLimit)
  app.use(httpLogger)

  app.use(createAuthRouter(db, tokenStore))
  app.use(createUserRouter(db))
  app.use(createDeviceRouter(db))
  app.use(createServerRouter(db))

  app.use((_req, _res, next) => next(new NotFoundError()))
  app.use(errorMiddleware)

  return app
}
