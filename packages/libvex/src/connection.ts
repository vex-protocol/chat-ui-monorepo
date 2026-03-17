/**
 * VexConnection — wraps ReconnectingWebSocket and handles the NaCl challenge/signature
 * handshake that old spire's ws.service.ts expects on every new connection.
 *
 * Old spire WS protocol:
 *   Frame format: [32-byte header][msgpack-encoded body]
 *   1. Server sends challenge: { transmissionID, type: "challenge", challenge: Uint8Array(16) }
 *   2. Client responds: { transmissionID, type: "response", signed: nacl.sign(challenge, key) }
 *   3. Server sends { type: "authorized" } or { type: "authErr", error }
 *   4. Server sends { type: "ping" } every 5s, client must reply { type: "pong" }
 *   5. Notify events: { type: "notify", event: "mail"|"permission"|"serverChange", data? }
 */
import ReconnectingWebSocketModule from 'reconnecting-websocket'
import { decode as decodeMsgpack, encode as encodeMsgpack } from '@msgpack/msgpack'
import { signMessage } from '@vex-chat/crypto'
import { v4 as uuidv4 } from 'uuid'
import type { EventEmitter } from 'eventemitter3'
import type { IMail } from '@vex-chat/types'
import type { VexEvents } from './client.ts'

/** Structural interface for the parts of ReconnectingWebSocket we use. */
interface IRws {
  binaryType: BinaryType
  send(data: string | ArrayBuffer): void
  close(code?: number): void
  addEventListener(type: 'message', handler: (event: MessageEvent) => void): void
  addEventListener(type: 'open', handler: (event: Event) => void): void
  addEventListener(type: 'close', handler: (event: CloseEvent) => void): void
  addEventListener(type: 'error', handler: (event: Event) => void): void
}

// Cast needed: reconnecting-websocket ships CJS types that don't expose a
// construct signature under nodenext moduleResolution without esModuleInterop magic.
const RWS = ReconnectingWebSocketModule as unknown as new (url: string) => IRws

const HEADER_SIZE = 32

/** Parse an old-spire binary frame: [32-byte header][msgpack body] */
function parseFrame(data: ArrayBuffer): { header: Uint8Array; body: Record<string, unknown> } | null {
  const buf = new Uint8Array(data)
  if (buf.length < HEADER_SIZE) return null
  const header = buf.subarray(0, HEADER_SIZE)
  const body = decodeMsgpack(buf.subarray(HEADER_SIZE)) as Record<string, unknown>
  return { header, body }
}

/** Build an old-spire binary frame: [32-byte zero header][msgpack body] */
function buildFrame(body: Record<string, unknown>): Uint8Array {
  const encoded = encodeMsgpack(body)
  const frame = new Uint8Array(HEADER_SIZE + encoded.length)
  // header is all zeros (no encryption header for control messages)
  frame.set(new Uint8Array(encoded), HEADER_SIZE)
  return frame
}

export class VexConnection {
  private rws: IRws | null = null
  private pingInterval: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly wsUrl: string,
    private readonly deviceID: string,
    private readonly deviceKey: Uint8Array,
    private readonly emitter: EventEmitter<VexEvents>,
    /** Called with the raw (encrypted) IMail frame before SessionManager decrypts it. */
    private readonly onRawMail: (mail: IMail) => void,
    private readonly token?: string,
  ) {}

  connect(): void {
    this.rws = new RWS(this.wsUrl)
    this.rws.binaryType = 'arraybuffer'

    let authenticated = false

    this.rws.addEventListener('message', (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return

      const frame = parseFrame(event.data as ArrayBuffer)
      if (!frame) return

      const { body } = frame
      const type = body['type'] as string | undefined

      if (!authenticated) {
        if (type === 'challenge') {
          // Sign the challenge bytes with full NaCl sign (signature || message)
          const challenge = body['challenge'] as Uint8Array
          const signed = signMessage(challenge, this.deviceKey)
          const response = buildFrame({
            transmissionID: body['transmissionID'],
            type: 'response',
            signed,
          })
          this.rws!.send(response.buffer as ArrayBuffer)
          return
        }
        if (type === 'authorized') {
          authenticated = true
          // Send client→server pings so spire calls markUserSeen (updates lastSeen)
          this.rws!.send(buildFrame({ transmissionID: uuidv4(), type: 'ping' }).buffer as ArrayBuffer)
          this.pingInterval = setInterval(() => {
            this.rws?.send(buildFrame({ transmissionID: uuidv4(), type: 'ping' }).buffer as ArrayBuffer)
          }, 30_000)
          return
        }
        if (type === 'authErr') {
          this.emitter.emit('error', new Error(`WS auth failed: ${body['error']}`))
          return
        }
        return
      }

      // Authenticated message handling
      if (type === 'ping') {
        this.rws!.send(buildFrame({ transmissionID: body['transmissionID'], type: 'pong' }).buffer as ArrayBuffer)
        return
      }

      if (type === 'notify') {
        const event = body['event'] as string
        if (event === 'mail') {
          // Old spire sends notify with no payload — client must poll via fetchInbox
          // But if data is present, treat it as a raw mail frame
          if (body['data']) {
            this.onRawMail(body['data'] as IMail)
          }
        }
        // Other notify events (permission, serverChange) could be handled here
        return
      }

      // Handle resource/success messages that may carry mail payloads
      if (type === 'success' && body['data']) {
        const data = body['data'] as Record<string, unknown>
        if (data['mailID']) {
          this.onRawMail(data as unknown as IMail)
        }
      }
    })

    this.rws.addEventListener('open', () => {
      // Send JWT as first message so spire can authenticate without cookies/headers
      if (this.token) {
        this.rws!.send(buildFrame({ transmissionID: uuidv4(), type: 'auth', token: this.token }).buffer as ArrayBuffer)
      }
      this.emitter.emit('ready')
    })

    this.rws.addEventListener('close', () => {
      authenticated = false
      if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null }
      this.emitter.emit('close')
    })

    this.rws.addEventListener('error', (event: Event) => {
      this.emitter.emit('error', new Error(String(event)))
    })
  }

  disconnect(): void {
    if (this.pingInterval) { clearInterval(this.pingInterval); this.pingInterval = null }
    this.rws?.close()
    this.rws = null
  }
}
