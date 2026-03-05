import { EventEmitter } from 'eventemitter3'
import { generateSignKeyPair } from '@vex-chat/crypto'
import type { IUser, IDevice, IKeyBundle, IServer, IChannel, IInvite, IActionToken, TokenType, DecryptedMail } from '@vex-chat/types'
import { HttpClient } from './http.ts'
import { VexConnection } from './connection.ts'
import { SessionManager } from './session.ts'
import { fromEvent } from './iterators.ts'
import { register, login, logout, whoami, getToken } from './auth.ts'
import type { RegisterResult, LoginResult } from './auth.ts'
import { sendMailEncrypted, fetchInboxDecrypted } from './mail.ts'
import type { SendResult } from './mail.ts'
import { listDevices, fetchKeyBundle } from './devices.ts'
import { createServer, listServers, listChannels, createChannel, deleteServer, deleteChannel } from './servers.ts'
import { getUser as getUserById, searchUsers as searchUsersHttp } from './users.ts'

export interface VexEvents {
  /** Emitted when the WebSocket connection is established (before auth handshake). */
  ready: () => void
  /** Emitted after a successful login or register. */
  authed: (user: IUser) => void
  /** Emitted when a decrypted mail message is received over the WebSocket. */
  mail: (mail: DecryptedMail) => void
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
 * const client = VexClient.create('https://example.com', deviceID, deviceKey)
 * await client.connect()
 * const result = await client.login('alice', 'hunter2')
 * if (result.ok) {
 *   for await (const mail of client.mail()) {
 *     console.log(mail.content)
 *   }
 * }
 */
export class VexClient extends EventEmitter<VexEvents> {
  private readonly http: HttpClient
  private connection: VexConnection | null = null
  private sessionManager: SessionManager | null = null
  /** Cached userID of the authenticated user, set on login/register/whoami. */
  private currentUserID: string | null = null

  private constructor(
    private readonly serverUrl: string,
    private readonly deviceID: string,
    private readonly deviceKey: Uint8Array,
    preKeySecret?: Uint8Array,
  ) {
    super()
    this.http = new HttpClient(serverUrl)
    if (preKeySecret) {
      this.sessionManager = new SessionManager(deviceKey, preKeySecret)
    }
  }

  /**
   * Creates a VexClient instance.
   *
   * @param serverUrl    - Base HTTP URL of the Vex server (e.g. 'https://chat.example.com')
   * @param deviceID     - UUID of the registered device (returned by POST /register)
   * @param deviceKey    - Ed25519 secret key seed for the device (32 bytes). Never leaves the client.
   * @param preKeySecret - Ed25519 secret key seed of the registered preKey (32 bytes).
   *                       Required to decrypt incoming messages.
   */
  static create(
    serverUrl: string,
    deviceID: string,
    deviceKey: Uint8Array,
    preKeySecret?: Uint8Array,
  ): VexClient {
    return new VexClient(serverUrl, deviceID, deviceKey, preKeySecret)
  }

  /** Pre-seeds the Authorization Bearer token (e.g. from a login response). */
  setAuthToken(token: string): void {
    this.http.setToken(token)
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
    this.connection = new VexConnection(wsUrl, this.deviceID, this.deviceKey, this, (rawMail) => {
      if (!this.sessionManager) return
      const decrypted = this.sessionManager.decrypt(rawMail)
      if (decrypted) this.emit('mail', decrypted)
    })
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
    if (result.ok) {
      this.currentUserID = result.user.userID
      this.emit('authed', result.user)
    }
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
      this.currentUserID = result.user.userID
      this.emit('authed', result.user)
    }
    return result
  }

  /** Clears the stored JWT. */
  async logout(): Promise<void> {
    await logout(this.http)
    this.http.clearToken()
    this.currentUserID = null
  }

  /** Returns the currently authenticated user. */
  async whoami(): Promise<IUser> {
    const user = await whoami(this.http)
    this.currentUserID = user.userID
    return user
  }

  /** Requests a single-use action token of the given type. */
  async getToken(type: TokenType): Promise<IActionToken> {
    return getToken(this.http, type)
  }

  /**
   * Encrypts `content` and sends it to `recipientDeviceID`.
   * Fetches the recipient's key bundle to perform X3DH key agreement.
   *
   * @param content             - Plaintext message body
   * @param recipientDeviceID   - UUID of the recipient's device
   * @param recipientUserID     - userID of the recipient
   * @param options.group       - channelID for group messages; omit for DMs
   */
  async sendMail(
    content: string,
    recipientDeviceID: string,
    recipientUserID: string,
    options?: { group?: string | null },
  ): Promise<SendResult> {
    if (!this.sessionManager) {
      return { ok: false, error: { code: 'CRYPTO_ERROR', message: 'preKeySecret not provided — cannot encrypt' } }
    }
    if (!this.currentUserID) {
      return { ok: false, error: { code: 'NOT_AUTHENTICATED', message: 'Not authenticated' } }
    }

    return sendMailEncrypted(this.http, this.sessionManager, content, {
      senderDeviceID: this.deviceID,
      senderUserID: this.currentUserID,
      recipientDeviceID,
      recipientUserID,
      group: options?.group ?? null,
    })
  }

  /**
   * Fetches all pending mail for this device, decrypts each message, and returns them.
   * Messages that fail to decrypt are silently skipped.
   */
  async fetchInbox(): Promise<DecryptedMail[]> {
    return fetchInboxDecrypted(this.http, this.sessionManager, this.deviceID)
  }

  /**
   * Returns a real-time AsyncIterable of incoming decrypted mail messages.
   * Works with `for await...of`, Svelte readable stores, and React Native useEffect.
   *
   * @example
   * for await (const mail of client.mail()) {
   *   console.log(mail.content)
   * }
   */
  mail(): AsyncIterable<DecryptedMail> {
    return fromEvent<DecryptedMail>(this, 'mail')
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
    if (!this.currentUserID) return []
    return listServers(this.http, this.currentUserID)
  }

  /** Returns the public profile for a user by ID, or null if not found. */
  async getUser(userID: string): Promise<IUser | null> {
    return getUserById(this.http, userID)
  }

  /** Searches for users by username substring. Returns at most 10 results. */
  async searchUsers(query: string): Promise<IUser[]> {
    return searchUsersHttp(this.http, query)
  }

  /** Returns all channels within a server. */
  async listChannels(serverID: string): Promise<IChannel[]> {
    return listChannels(this.http, serverID)
  }

  /** Creates a channel within a server. */
  async createChannel(serverID: string, name: string): Promise<IChannel> {
    return createChannel(this.http, serverID, name)
  }

  /** Deletes a server (requires permission level ≥ 50). */
  async deleteServer(serverID: string): Promise<void> {
    return deleteServer(this.http, serverID)
  }

  /** Deletes a channel. */
  async deleteChannel(channelID: string): Promise<void> {
    return deleteChannel(this.http, channelID)
  }

  /**
   * Uploads a new avatar image for the authenticated user.
   * @param data      - Raw image bytes
   * @param mimeType  - MIME type (e.g. 'image/jpeg', 'image/png')
   */
  async setAvatar(data: Uint8Array, mimeType: string): Promise<void> {
    if (!this.currentUserID) throw new Error('Not authenticated')
    const result = await this.http.postRaw(`/avatar/${this.currentUserID}`, data, mimeType)
    if (!result.ok) throw new Error(result.error.message)
  }

  /** Returns the URL of a user's avatar with an optional cache-busting version param. */
  avatarUrl(userID: string, version?: number): string {
    return `${this.serverUrl}/avatar/${userID}${version !== undefined ? `?v=${version}` : ''}`
  }

  // ── Invites ────────────────────────────────────────────────────────────────

  /** Creates an invite for a server. Requires INVITE_POWER (25+) on the server. */
  async createInvite(serverID: string, expiration: string | null = null): Promise<IInvite> {
    const result = await this.http.post<IInvite>(`/server/${serverID}/invites`, { expiration })
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  }

  /** Lists all invites for a server. */
  async listInvites(serverID: string): Promise<IInvite[]> {
    const result = await this.http.get<IInvite[]>(`/server/${serverID}/invites`)
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  }

  /** Fetches public invite details (server name, expiration). No auth required. */
  async getInvite(inviteID: string): Promise<{ inviteID: string; serverID: string; serverName: string | null; expiration: string | null }> {
    const result = await this.http.get<{ inviteID: string; serverID: string; serverName: string | null; expiration: string | null }>(`/invite/${inviteID}`)
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  }

  /** Joins a server via invite code. Returns the server on success. */
  async joinServerViaInvite(inviteID: string): Promise<IServer> {
    const result = await this.http.post<{ ok: boolean; server: IServer }>(`/invite/${inviteID}/join`)
    if (!result.ok) throw new Error(result.error.message)
    return result.data.server
  }

  /** Deletes an invite. Must be the invite creator or a server admin. */
  async deleteInvite(serverID: string, inviteID: string): Promise<void> {
    const result = await this.http.delete(`/server/${serverID}/invites/${inviteID}`)
    if (!result.ok) throw new Error(result.error.message)
  }

  // ── Fingerprints ────────────────────────────────────────────────────────────

  /**
   * Computes a conversation fingerprint for verifying the encryption session
   * with another user's device. Both parties produce the same string.
   *
   * @param theirSignKey - Hex Ed25519 public key of the other party's device
   * @returns Formatted fingerprint, or null if SessionManager unavailable
   */
  getFingerprint(theirSignKey: string): string | null {
    if (!this.sessionManager) return null
    return this.sessionManager.fingerprint(theirSignKey)
  }

  // ── Files ──────────────────────────────────────────────────────────────────

  /**
   * Uploads a file to the server.
   * @param data        - Raw file bytes
   * @param contentType - MIME type (e.g. 'image/png', 'application/pdf')
   * @param nonce       - Optional nonce for client-side encryption metadata
   * @returns The assigned fileID and nonce
   */
  async uploadFile(data: Uint8Array, contentType: string, nonce = ''): Promise<{ fileID: string; nonce: string }> {
    const extra: Record<string, string> = {}
    if (nonce) extra['X-File-Nonce'] = nonce
    const result = await this.http.postRawJson<{ fileID: string; nonce: string }>('/file', data, contentType, extra)
    if (!result.ok) throw new Error(result.error.message)
    return result.data
  }

  /**
   * Downloads a file from the server.
   * @param fileID - The file's UUID
   * @returns The file data, content type, and nonce
   */
  async downloadFile(fileID: string): Promise<{ data: Uint8Array; contentType: string; nonce: string }> {
    const result = await this.http.getRaw(`/file/${fileID}`)
    if (!result.ok) throw new Error(result.error.message)
    return {
      data: result.data.data,
      contentType: result.data.contentType,
      nonce: result.data.headers['x-file-nonce'] ?? '',
    }
  }

  /** Returns the URL for a file (for use in <img> tags etc.) */
  fileUrl(fileID: string): string {
    return `${this.serverUrl}/file/${fileID}`
  }
}
