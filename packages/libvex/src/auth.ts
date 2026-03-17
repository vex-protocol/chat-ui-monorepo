import type { IUser, IDevice, IActionToken, TokenType } from '@vex-chat/types'
import type { HttpClient } from './http.ts'
import type { VexError } from './errors.ts'
import { normalizeLoginResponse, normalizeWhoami, normalizeUser, normalizeDevice } from './wire.ts'
import { generateSignKeyPair, signMessage, encodeHex } from '@vex-chat/crypto'
import { parse as uuidParse } from 'uuid'

export type RegisterResult =
  | { ok: true; user: IUser }
  | { ok: false; error: VexError }

export type LoginResult =
  | { ok: true; user: IUser; token: string }
  | { ok: false; error: VexError }

/** Full result of registerAndLogin — everything the app needs to bootstrap. */
export type RegisterAndLoginResult =
  | { ok: true; user: IUser; token: string; deviceID: string; signKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array }; preKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array } }
  | { ok: false; error: VexError }

export type RegisterDeviceResult =
  | { ok: true; deviceID: string; signKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array }; preKeyPair: { publicKey: Uint8Array; secretKey: Uint8Array } }
  | { ok: false; error: VexError }

export async function register(
  http: HttpClient,
  username: string,
  password: string,
  payload: Record<string, unknown>,
): Promise<RegisterResult> {
  const result = await http.post<Record<string, unknown>>('/register', { username, password, ...payload })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, user: normalizeUser(result.data) }
}

/**
 * Full registration flow for old spire:
 *   1. Generate signing + preKey key pairs
 *   2. GET /token/register → action token
 *   3. Sign token UUID with device key
 *   4. POST /register → creates user + device
 *   5. POST /auth → get JWT
 *   6. GET /user/:id/devices → find our deviceID by signKey
 */
export async function registerAndLogin(
  http: HttpClient,
  username: string,
  password: string,
  deviceName: string = 'Desktop',
): Promise<RegisterAndLoginResult> {
  // 1. Generate key pairs
  const signKeyPair = generateSignKeyPair()
  const preKeyPair = generateSignKeyPair()

  // 2. Fetch registration token (no auth required)
  const tokenResult = await http.get<Record<string, unknown>>('/token/register')
  if (!tokenResult.ok) return { ok: false, error: tokenResult.error }
  const tokenKey = tokenResult.data['key'] as string

  // 3. Sign the token UUID bytes with the device signing key (NaCl format: sig || msg)
  const tokenBytes = uuidParse(tokenKey) as Uint8Array
  const signed = signMessage(tokenBytes, signKeyPair.secretKey)

  // 4. Sign the preKey public key
  const preKeySignature = signMessage(preKeyPair.publicKey, signKeyPair.secretKey)

  // 5. POST /register
  const regResult = await http.post<Record<string, unknown>>('/register', {
    username,
    password,
    signKey: encodeHex(signKeyPair.publicKey),
    signed: encodeHex(signed),
    preKey: encodeHex(preKeyPair.publicKey),
    preKeySignature: encodeHex(preKeySignature),
    preKeyIndex: 0,
    deviceName,
  })
  if (!regResult.ok) return { ok: false, error: regResult.error }

  // 6. POST /auth to get JWT (old spire doesn't return token from /register)
  const loginResult = await login(http, username, password)
  if (!loginResult.ok) return { ok: false, error: loginResult.error }

  // 7. Set token so we can make authenticated requests
  http.setToken(loginResult.token)

  // 8. Find our deviceID by matching signKey against the device list
  const signKeyHex = encodeHex(signKeyPair.publicKey)
  const devicesResult = await http.get<Record<string, unknown>[]>(`/user/${loginResult.user.userID}/devices`)
  if (!devicesResult.ok) return { ok: false, error: devicesResult.error }

  const devices = devicesResult.data.map(normalizeDevice)
  const ourDevice = devices.find((d: IDevice) => d.signKey === signKeyHex)
  if (!ourDevice) {
    return { ok: false, error: { code: 'SERVER_ERROR', message: 'Device not found after registration' } }
  }

  return {
    ok: true,
    user: loginResult.user,
    token: loginResult.token,
    deviceID: ourDevice.deviceID,
    signKeyPair,
    preKeyPair,
  }
}

export async function login(
  http: HttpClient,
  username: string,
  password: string,
): Promise<LoginResult> {
  // Old spire returns nested: { user: { userID, username, lastSeen }, token }
  // New server returns flat: { token, userID, username, lastSeen }
  // normalizeLoginResponse handles both
  const result = await http.post<Record<string, unknown>>('/auth', { username, password })
  if (!result.ok) return { ok: false, error: result.error }
  const { token, ...user } = normalizeLoginResponse(result.data)
  return { ok: true, user, token }
}

export async function logout(http: HttpClient): Promise<void> {
  await http.post('/goodbye')
}

export async function whoami(http: HttpClient): Promise<IUser> {
  // Old spire returns: { user: { ... }, exp, token }
  // normalizeWhoami handles both nested and flat
  const result = await http.post<Record<string, unknown>>('/whoami')
  if (!result.ok) throw new Error(result.error.message)
  return normalizeWhoami(result.data)
}

export async function getToken(http: HttpClient, type: TokenType): Promise<IActionToken> {
  const result = await http.get<IActionToken>(`/token/${type}`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

/**
 * Registers a new device for an already-authenticated user.
 * Requires a valid JWT on the HttpClient (call login() first).
 *
 *   1. Generate signing + preKey key pairs
 *   2. GET /token/device → action token
 *   3. Sign token UUID with device key
 *   4. POST /user/:id/devices → creates device, returns IDevice
 */
export async function registerDevice(
  http: HttpClient,
  userID: string,
  deviceName: string = 'Desktop',
): Promise<RegisterDeviceResult> {
  const signKeyPair = generateSignKeyPair()
  const preKeyPair = generateSignKeyPair()

  // Fetch device token (requires auth)
  const tokenResult = await http.get<Record<string, unknown>>('/token/device')
  if (!tokenResult.ok) return { ok: false, error: tokenResult.error }
  const tokenKey = tokenResult.data['key'] as string

  // Sign the token UUID bytes
  const tokenBytes = uuidParse(tokenKey) as Uint8Array
  const signed = signMessage(tokenBytes, signKeyPair.secretKey)

  // Sign the preKey public key
  const preKeySignature = signMessage(preKeyPair.publicKey, signKeyPair.secretKey)

  // POST /user/:id/devices
  const devResult = await http.post<Record<string, unknown>>(`/user/${userID}/devices`, {
    signKey: encodeHex(signKeyPair.publicKey),
    signed: encodeHex(signed),
    preKey: encodeHex(preKeyPair.publicKey),
    preKeySignature: encodeHex(preKeySignature),
    preKeyIndex: 0,
    deviceName,
  })
  if (!devResult.ok) return { ok: false, error: devResult.error }

  const device = normalizeDevice(devResult.data)
  return { ok: true, deviceID: device.deviceID, signKeyPair, preKeyPair }
}

/**
 * Logs in an existing user and registers a new device for them.
 * Use this when the user has an account but no device credentials on this machine.
 *
 *   1. POST /auth → JWT + user
 *   2. registerDevice() → new key pairs + deviceID
 *
 * Returns the same shape as registerAndLogin() for seamless use.
 */
export async function loginNewDevice(
  http: HttpClient,
  username: string,
  password: string,
  deviceName: string = 'Desktop',
): Promise<RegisterAndLoginResult> {
  // Login first to get JWT
  const loginResult = await login(http, username, password)
  if (!loginResult.ok) return { ok: false, error: loginResult.error }

  http.setToken(loginResult.token)

  // Register a new device under this user
  const devResult = await registerDevice(http, loginResult.user.userID, deviceName)
  if (!devResult.ok) return { ok: false, error: devResult.error }

  return {
    ok: true,
    user: loginResult.user,
    token: loginResult.token,
    deviceID: devResult.deviceID,
    signKeyPair: devResult.signKeyPair,
    preKeyPair: devResult.preKeyPair,
  }
}
