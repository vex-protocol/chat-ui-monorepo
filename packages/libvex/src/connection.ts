/**
 * VexConnection — wraps ReconnectingWebSocket and handles the NaCl challenge/signature
 * handshake that spire's ws.service.ts expects on every new connection.
 *
 * Protocol:
 *   1. Server sends 32 raw bytes (the challenge) as the first message.
 *   2. Client signs the challenge with its device Ed25519 key and sends back:
 *      { deviceID: string, signature: string (hex) }
 *   3. After that, all messages are JSON and routed by resource type.
 */
import ReconnectingWebSocketModule from 'reconnecting-websocket'
import { signDetached, encodeHex } from '@vex-chat/crypto'
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

export class VexConnection {
  private rws: IRws | null = null

  constructor(
    private readonly wsUrl: string,
    private readonly deviceID: string,
    private readonly deviceKey: Uint8Array,
    private readonly emitter: EventEmitter<VexEvents>,
    /** Called with the raw (encrypted) IMail frame before SessionManager decrypts it. */
    private readonly onRawMail: (mail: IMail) => void,
  ) {}

  connect(): void {
    this.rws = new RWS(this.wsUrl)
    this.rws.binaryType = 'arraybuffer'

    let authenticated = false

    this.rws.addEventListener('message', (event: MessageEvent) => {
      if (!authenticated) {
        // First message is the 32-byte challenge
        if (event.data instanceof ArrayBuffer) {
          const challenge = new Uint8Array(event.data as ArrayBuffer)
          const signature = signDetached(challenge, this.deviceKey)
          this.rws!.send(JSON.stringify({ deviceID: this.deviceID, signature: encodeHex(signature) }))
          authenticated = true
        }
        return
      }

      let msg: unknown
      try {
        const raw = event.data as unknown
        msg = JSON.parse(typeof raw === 'string' ? raw : new TextDecoder().decode(raw as ArrayBuffer))
      } catch {
        return
      }

      if (
        msg !== null &&
        typeof msg === 'object' &&
        'resource' in msg &&
        (msg as Record<string, unknown>)['resource'] === 'mail'
      ) {
        this.onRawMail((msg as Record<string, unknown>)['payload'] as IMail)
      }
    })

    this.rws.addEventListener('open', () => {
      this.emitter.emit('ready')
    })

    this.rws.addEventListener('close', () => {
      authenticated = false
      this.emitter.emit('close')
    })

    this.rws.addEventListener('error', (event: Event) => {
      this.emitter.emit('error', new Error(String(event)))
    })
  }

  disconnect(): void {
    this.rws?.close()
    this.rws = null
  }
}
