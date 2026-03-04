import { EventEmitter } from 'eventemitter3'
import { generateSignKeyPair } from '@vex-chat/crypto'
import type { IUser, IMail, IDevice, IKeyBundle, IServer, IChannel, IActionToken, TokenType } from '@vex-chat/types'
import { HttpClient } from './http.ts'
import { VexConnection } from './connection.ts'
import { fromEvent } from './iterators.ts'
import { register, login, logout, whoami, getToken } from './auth.ts'
import type { RegisterResult, LoginResult } from './auth.ts'
import { sendMail, fetchInbox } from './mail.ts'
import type { SendResult } from './mail.ts'
import { listDevices, fetchKeyBundle } from './devices.ts'
import { createServer, listServers, createChannel } from './servers.ts'

export interface VexEvents {
  /** Emitted when the WebSocket connection is established (before auth handshake). */
  ready: () => void
  /** Emitted after a successful login or register. */
  authed: (user: IUser) => void
  /** Emitted when a mail message is received over the WebSocket. */
  mail: (mail: IMail) => void
  /** Emitted when a server record changes (created, updated, deleted). */
  serverChange: (server: IServer) => void
  /** Emitted when the WebSocket connection closes. */
  close: () => void
  /** Emitted on WebSocket error. */
  error: (err: Error) => void
}

/**
 * VexClient — framework-agnostic client SDK for the Vex chat platform.
 *
 * @example
 * const client = VexClient.create('https://example.com', deviceKey)
 * await client.connect()
 * const result = await client.login('alice', 'hunter2')
 * if (result.ok) {
 *   for await (const mail of client.mail()) {
 *     console.log(mail)
 *   }
 * }
 */
export class VexClient extends EventEmitter<VexEvents> {
  private readonly http: HttpClient
  private connection: VexConnection | null = null

  private constructor(
    private readonly serverUrl: string,
    private readonly deviceID: string,
    private readonly deviceKey: Uint8Array,
  ) {
    super()
    this.http = new HttpClient(serverUrl)
  }

  /**
   * Creates a VexClient instance.
   *
   * @param serverUrl - Base HTTP URL of the Vex server (e.g. 'https://chat.example.com')
   * @param deviceID  - UUID of the registered device
   * @param deviceKey - Ed25519 secret key for the device (64 bytes). Never leaves the client.
   */
  static create(serverUrl: string, deviceID: string, deviceKey: Uint8Array): VexClient {
    return new VexClient(serverUrl, deviceID, deviceKey)
  }

  /**
   * Generates a new Ed25519 signing key pair for device registration.
   * Store the secretKey securely — it is never sent to the server.
   */
  static generateKeyPair(): { publicKey: Uint8Array; secretKey: Uint8Array } {
    return generateSignKeyPair()
  }

  /**
   * Opens the WebSocket connection to the server and completes the NaCl challenge handshake.
   * Emits 'ready' once connected.
   */
  async connect(): Promise<void> {
    const wsUrl = this.serverUrl.replace(/^http/, 'ws') + '/ws'
    this.connection = new VexConnection(wsUrl, this.deviceID, this.deviceKey, this)
    this.connection.connect()
    await new Promise<void>((resolve) => this.once('ready', resolve))
  }

  /** Closes the WebSocket connection. */
  async disconnect(): Promise<void> {
    this.connection?.disconnect()
    this.connection = null
  }

  /**
   * Registers a new user account.
   * @returns Discriminated union — check `result.ok` before using `result.user`.
   */
  async register(
    username: string,
    password: string,
    payload: Record<string, unknown>,
  ): Promise<RegisterResult> {
    const result = await register(this.http, username, password, payload)
    if (result.ok) this.emit('authed', result.user)
    return result
  }

  /**
   * Authenticates with the server and stores the JWT for subsequent requests.
   * @returns Discriminated union — check `result.ok` before using `result.user`.
   */
  async login(username: string, password: string): Promise<LoginResult> {
    const result = await login(this.http, username, password)
    if (result.ok) {
      this.http.setToken(result.token)
      this.emit('authed', result.user)
    }
    return result
  }

  /** Clears the stored JWT. */
  async logout(): Promise<void> {
    await logout(this.http)
    this.http.clearToken()
  }

  /** Returns the currently authenticated user. */
  async whoami(): Promise<IUser> {
    return whoami(this.http)
  }

  /** Requests a single-use action token of the given type. */
  async getToken(type: TokenType): Promise<IActionToken> {
    return getToken(this.http, type)
  }

  /**
   * Sends a mail message.
   * @returns Discriminated union — check `result.ok` before using `result.mail`.
   */
  async sendMail(payload: IMail): Promise<SendResult> {
    return sendMail(this.http, payload)
  }

  /** Fetches all pending mail for a device and returns it. */
  async fetchInbox(deviceID: string): Promise<IMail[]> {
    return fetchInbox(this.http, deviceID)
  }

  /**
   * Returns a real-time AsyncIterable of incoming mail messages.
   * Works with `for await...of`, Svelte readable stores, and React Native useEffect.
   *
   * @example
   * for await (const mail of client.mail()) {
   *   console.log(mail)
   * }
   */
  mail(): AsyncIterable<IMail> {
    return fromEvent<IMail>(this, 'mail')
  }

  /** Returns all devices registered to a user. */
  async listDevices(userID: string): Promise<IDevice[]> {
    return listDevices(this.http, userID)
  }

  /** Fetches the X3DH key bundle for a device (used before sending the first message). */
  async fetchKeyBundle(deviceID: string): Promise<IKeyBundle> {
    return fetchKeyBundle(this.http, deviceID)
  }

  /** Creates a new server. */
  async createServer(name: string, icon: string): Promise<IServer> {
    return createServer(this.http, name, icon)
  }

  /** Returns all servers the authenticated user is a member of. */
  async listServers(): Promise<IServer[]> {
    return listServers(this.http)
  }

  /** Creates a channel within a server. */
  async createChannel(serverID: string, name: string): Promise<IChannel> {
    return createChannel(this.http, serverID, name)
  }
}
