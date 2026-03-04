// zod-to-openapi extension must happen before any domain schema import
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'
extendZodWithOpenApi(z)

import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'
import { parseConfig } from '#config'
import { createDb } from '#db/index.js'
import { migrateToLatest } from '#db/migrate.js'
import { createTokenStore } from '#auth/auth.service.js'
import { createConnectionManager } from '#ws/ws.service.js'
import { createApp } from './app.js'
import { rootLogger as logger } from './utils/logger.js'

const config = parseConfig()
const db = createDb(config)
await migrateToLatest(db)

const tokenStore = createTokenStore()
const app = createApp(db, tokenStore, config.JWT_SECRET)

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
