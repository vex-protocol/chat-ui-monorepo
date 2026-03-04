import { describe, it, expect, vi, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import nacl from 'tweetnacl'
import type { Kysely } from 'kysely'
import { useDb } from '#test/helpers/db.js'
import { seedUser } from '#test/helpers/factories.js'
import { createDevice } from '#devices/devices.service.js'
import type { DevicePayload } from '#devices/devices.service.js'
import type { Database } from '#db/types.js'
import { createConnectionManager } from '../ws.service.js'
import type { ConnectionManager, WsLike } from '../ws.service.js'

// ---------------------------------------------------------------------------
// Mock WebSocket
// ---------------------------------------------------------------------------

class MockWebSocket extends EventEmitter implements WsLike {
  send = vi.fn()
  close = vi.fn()
  ping = vi.fn()
  readyState = 1 // OPEN
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

/** Generates a device payload while retaining the signing key pair. */
function makeDeviceSetup() {
  const kp = nacl.sign.keyPair()
  const preKp = nacl.sign.keyPair()
  const preKeySig = nacl.sign(preKp.publicKey, kp.secretKey)
  const payload: DevicePayload = {
    signKey: Buffer.from(kp.publicKey).toString('hex'),
    preKey: Buffer.from(preKp.publicKey).toString('hex'),
    preKeySignature: Buffer.from(preKeySig).toString('hex'),
    preKeyIndex: 0,
    deviceName: 'test-device',
  }
  return { kp, payload }
}

/**
 * Drain the microtask queue so async event handlers (which do DB lookups)
 * complete before the test resumes. 10 hops covers Kysely's internal
 * Promise chain over better-sqlite3's synchronous driver.
 * Promise.resolve() is a microtask — unaffected by vi.useFakeTimers().
 */
async function flushMicrotasks(): Promise<void> {
  for (let i = 0; i < 15; i++) await Promise.resolve()
}

/** Connects a MockWebSocket and completes the full auth handshake. */
async function connectAndAuth(
  manager: ConnectionManager,
  db: Kysely<Database>,
): Promise<{ ws: MockWebSocket; deviceID: string }> {
  const ws = new MockWebSocket()
  const owner = await seedUser(db)
  const { kp, payload } = makeDeviceSetup()
  const device = await createDevice(db, owner, payload)

  manager.handleConnection(ws, db)

  // Capture challenge sent by server (first ws.send call)
  const challenge = ws.send.mock.calls[0]![0] as Buffer
  const sig = nacl.sign.detached(challenge, kp.secretKey)

  ws.emit(
    'message',
    Buffer.from(
      JSON.stringify({
        type: 'auth',
        deviceID: device.deviceID,
        signature: Buffer.from(sig).toString('hex'),
      }),
    ),
  )

  // Wait for the async message handler (DB lookup + signature verify) to settle
  await flushMicrotasks()

  return { ws, deviceID: device.deviceID }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.useRealTimers()
})

describe('challenge', () => {
  it('sends a 32-byte challenge immediately on connection', async () => {
    const db = await useDb()
    const manager = createConnectionManager()
    const ws = new MockWebSocket()

    manager.handleConnection(ws, db)

    expect(ws.send).toHaveBeenCalledOnce()
    const challenge = ws.send.mock.calls[0]![0] as Buffer
    expect(challenge).toBeInstanceOf(Buffer)
    expect(challenge.byteLength).toBe(32)
  })
})

describe('authentication', () => {
  it('authenticates a client with a valid NaCl detached signature', async () => {
    const db = await useDb()
    const manager = createConnectionManager()

    const { ws, deviceID } = await connectAndAuth(manager, db)

    // Client is now registered — send() should reach it
    ws.send.mockClear()
    manager.send(deviceID, 'payload')
    expect(ws.send).toHaveBeenCalledWith('payload')
  })

  it('closes the connection when the signature is invalid', async () => {
    const db = await useDb()
    const manager = createConnectionManager()
    const ws = new MockWebSocket()
    const owner = await seedUser(db)
    const { payload } = makeDeviceSetup()
    const device = await createDevice(db, owner, payload)

    manager.handleConnection(ws, db)

    ws.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          type: 'auth',
          deviceID: device.deviceID,
          signature: '00'.repeat(64), // wrong signature
        }),
      ),
    )
    await flushMicrotasks()

    expect(ws.close).toHaveBeenCalled()
  })

  it('closes the connection when the deviceID is not found', async () => {
    const db = await useDb()
    const manager = createConnectionManager()
    const ws = new MockWebSocket()

    manager.handleConnection(ws, db)

    ws.emit(
      'message',
      Buffer.from(
        JSON.stringify({
          type: 'auth',
          deviceID: '00000000-0000-0000-0000-000000000000',
          signature: '00'.repeat(64),
        }),
      ),
    )
    await flushMicrotasks()

    expect(ws.close).toHaveBeenCalled()
  })
})

describe('message size limit', () => {
  it('closes the connection when a message exceeds 2048 bytes', async () => {
    const db = await useDb()
    const manager = createConnectionManager()
    const ws = new MockWebSocket()

    manager.handleConnection(ws, db)
    ws.emit('message', Buffer.alloc(2049, 'x'))

    expect(ws.close).toHaveBeenCalled()
  })
})

describe('heartbeat', () => {
  it('sends a ping after 5 seconds', async () => {
    vi.useFakeTimers()
    const db = await useDb()
    const manager = createConnectionManager()
    const { ws } = await connectAndAuth(manager, db)

    vi.advanceTimersByTime(5_000)

    expect(ws.ping).toHaveBeenCalled()
  })

  it('disconnects a client that does not respond to ping', async () => {
    vi.useFakeTimers()
    const db = await useDb()
    const manager = createConnectionManager()
    const { ws } = await connectAndAuth(manager, db)

    vi.advanceTimersByTime(5_000) // first ping — marks isAlive = false
    vi.advanceTimersByTime(5_000) // second tick — isAlive still false → close

    expect(ws.close).toHaveBeenCalled()
  })

  it('keeps the connection alive when a pong is received', async () => {
    vi.useFakeTimers()
    const db = await useDb()
    const manager = createConnectionManager()
    const { ws } = await connectAndAuth(manager, db)

    vi.advanceTimersByTime(5_000) // first ping
    ws.emit('pong')               // client responds
    vi.advanceTimersByTime(5_000) // second ping — should NOT disconnect

    expect(ws.close).not.toHaveBeenCalled()
    expect(ws.ping).toHaveBeenCalledTimes(2)
  })
})

describe('registry', () => {
  it('registers the authenticated client under its deviceID', async () => {
    const db = await useDb()
    const manager = createConnectionManager()
    const { ws, deviceID } = await connectAndAuth(manager, db)

    ws.send.mockClear()
    manager.send(deviceID, 'hello')

    expect(ws.send).toHaveBeenCalledWith('hello')
  })

  it('removes the client from the registry on disconnect', async () => {
    const db = await useDb()
    const manager = createConnectionManager()
    const { ws, deviceID } = await connectAndAuth(manager, db)

    ws.emit('close')
    ws.send.mockClear()

    manager.send(deviceID, 'hello')

    expect(ws.send).not.toHaveBeenCalled()
  })

  it('does not throw when sending to a device that is offline', () => {
    const manager = createConnectionManager()

    expect(() => manager.send('nonexistent-device-id', 'data')).not.toThrow()
  })
})

describe('message dispatch', () => {
  it('dispatches mail resource messages to the onMail handler', async () => {
    const db = await useDb()
    const onMail = vi.fn()
    const manager = createConnectionManager({ onMail })
    const { ws, deviceID } = await connectAndAuth(manager, db)

    ws.send.mockClear()
    const mailPayload = { resource: 'mail', to: 'recipient-device', body: 'cipher' }
    ws.emit('message', Buffer.from(JSON.stringify(mailPayload)))

    expect(onMail).toHaveBeenCalledWith(deviceID, mailPayload)
  })
})
