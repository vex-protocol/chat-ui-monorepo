import nacl from 'tweetnacl'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'
import { AuthMessageSchema, InboundMessageSchema } from './ws.schemas.js'

/**
 * Minimal WebSocket-like interface the connection manager works against.
 * Allows mocking in tests without importing the ws package.
 */
export interface WsLike {
  on(event: string, listener: (...args: unknown[]) => void): this
  send(data: Buffer | string): void
  close(code?: number): void
  ping(data?: Buffer): void
  readyState: number
}

export interface ConnectionManagerOptions {
  /** Called when an authenticated client sends a mail resource message. */
  onMail?: (senderDeviceID: string, payload: unknown) => void
}

export interface ConnectionManager {
  /**
   * Called when a new WebSocket connection is established.
   * Sends a 32-byte challenge and handles the auth handshake.
   */
  handleConnection(ws: WsLike, db: Kysely<Database>): void

  /**
   * Sends data to a connected device. No-op if the device is offline.
   */
  send(deviceID: string, data: string): void
}

const PING_INTERVAL_MS = 5_000
const MAX_MESSAGE_BYTES = 2048

export function createConnectionManager(options?: ConnectionManagerOptions): ConnectionManager {
  const clients = new Map<string, WsLike>()

  return {
    handleConnection(ws: WsLike, db: Kysely<Database>): void {
      // Send 32-byte challenge immediately
      const challenge = crypto.getRandomValues(new Uint8Array(32))
      ws.send(Buffer.from(challenge))

      let authenticatedDeviceID: string | null = null
      let isAlive = true
      let heartbeatInterval: ReturnType<typeof setInterval> | null = null

      function startHeartbeat(deviceID: string): void {
        isAlive = true
        ws.on('pong', () => {
          isAlive = true
        })
        heartbeatInterval = setInterval(() => {
          if (!isAlive) {
            ws.close()
            if (heartbeatInterval) clearInterval(heartbeatInterval)
            return
          }
          isAlive = false
          ws.ping()
        }, PING_INTERVAL_MS)

        clients.set(deviceID, ws)
        authenticatedDeviceID = deviceID
      }

      ws.on('close', () => {
        if (authenticatedDeviceID) clients.delete(authenticatedDeviceID)
        if (heartbeatInterval) clearInterval(heartbeatInterval)
      })

      ws.on('message', async (...args: unknown[]) => {
        const data = args[0] as Buffer

        if (data.byteLength > MAX_MESSAGE_BYTES) {
          ws.close()
          return
        }

        let msg: unknown
        try {
          msg = JSON.parse(data.toString('utf8'))
        } catch {
          ws.close()
          return
        }

        if (authenticatedDeviceID === null) {
          // Pre-auth: expect challenge response
          const parsed = AuthMessageSchema.safeParse(msg)
          if (!parsed.success) {
            ws.close()
            return
          }

          const { deviceID, signature } = parsed.data

          const device = await db
            .selectFrom('devices')
            .where('deviceID', '=', deviceID)
            .where('deleted', '=', 0)
            .select('signKey')
            .executeTakeFirst()

          if (!device) {
            ws.close()
            return
          }

          const signKeyBytes = Buffer.from(device.signKey, 'hex')
          const sigBytes = Buffer.from(signature, 'hex')

          const valid = nacl.sign.detached.verify(challenge, sigBytes, signKeyBytes)
          if (!valid) {
            ws.close()
            return
          }

          startHeartbeat(deviceID)
        } else {
          // Post-auth: route by resource type
          const parsed = InboundMessageSchema.safeParse(msg)
          if (!parsed.success) return

          if (parsed.data.resource === 'mail' && options?.onMail) {
            options.onMail(authenticatedDeviceID, parsed.data)
          }
        }
      })
    },

    send(deviceID: string, data: string): void {
      clients.get(deviceID)?.send(data)
    },
  }
}
