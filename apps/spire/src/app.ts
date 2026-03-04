import express from 'express'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'
import type { ITokenStore } from '#auth/auth.service.js'

/**
 * Creates the Express application.
 *
 * Accepts db and tokenStore as dependencies so tests can inject in-memory
 * instances without touching disk or environment.
 */
export function createApp(
  _db: Kysely<Database>,
  _tokenStore: ITokenStore,
): express.Application {
  const app = express()
  app.use(express.json())
  // Routes are registered in vex-chat-ekb (Implement HTTP API routes)
  return app
}
