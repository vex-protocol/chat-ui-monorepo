import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'

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

export function createConnectionManager(options?: ConnectionManagerOptions): ConnectionManager {
  throw new Error('not implemented')
}
