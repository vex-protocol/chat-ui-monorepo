// zod-to-openapi extension must happen before any domain schema import
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
extendZodWithOpenApi(z)

import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { parseConfig } from '#config'
import { createDb } from '#db/index.ts'
import { migrateToLatest } from '#db/migrate.ts'
import { createTokenStore } from '#auth/auth.token-store.ts'
import { createConnectionManager } from '#ws/ws.service.ts'
import { createApp } from './app.ts'
import { rootLogger as logger } from './utils/logger.ts'

let config: ReturnType<typeof parseConfig>
try {
  config = parseConfig()
} catch (err) {
  if (err instanceof z.ZodError) {
    console.error('Fatal: missing or invalid environment variables\n\n' + z.prettifyError(err))
    console.error('\nCopy apps/spire/.env.example to apps/spire/.env and fill in the values.')
    console.error('Or run: pnpm --filter @vex-chat/spire env:init\n')
  } else {
    console.error(err)
  }
  process.exit(1)
}
const db = createDb(config)
await migrateToLatest(db)

const tokenStore = createTokenStore()
const app = createApp(db, tokenStore, config.JWT_SECRET, config.OPEN_REGISTRATION)
if (config.OPEN_REGISTRATION) {
  logger.warn('OPEN_REGISTRATION=true — unauthenticated /token/open/register is active. Disable in production.')
}

const httpServer = createServer(app)

const connManager = createConnectionManager()
const wss = new WebSocketServer({ server: httpServer })
wss.on('connection', ws => connManager.handleConnection(ws, db))

httpServer.listen(config.API_PORT, () => {
  logger.info(`Spire listening on :${config.API_PORT}`)
})

async function shutdown(): Promise<void> {
  logger.info('Shutting down…')
  wss.close()
  httpServer.close()
  await db.destroy()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown())
process.on('SIGINT', () => void shutdown())
