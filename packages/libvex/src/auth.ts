import type { IUser, IActionToken, TokenType } from '@vex-chat/types'
import type { HttpClient } from './http.ts'
import type { VexError } from './errors.ts'

export type RegisterResult =
  | { ok: true; user: IUser }
  | { ok: false; error: VexError }

export type LoginResult =
  | { ok: true; user: IUser; token: string }
  | { ok: false; error: VexError }

export async function register(
  http: HttpClient,
  username: string,
  password: string,
  payload: Record<string, unknown>,
): Promise<RegisterResult> {
  const result = await http.post<IUser>('/register', { username, password, ...payload })
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, user: result.data }
}

export async function login(
  http: HttpClient,
  username: string,
  password: string,
): Promise<LoginResult> {
  // Spire returns a flat response: { token, userID, username, lastSeen }
  const result = await http.post<{ token: string; userID: string; username: string; lastSeen: string }>('/auth', { username, password })
  if (!result.ok) return { ok: false, error: result.error }
  const { token, ...user } = result.data
  return { ok: true, user, token }
}

export async function logout(http: HttpClient): Promise<void> {
  await http.post('/goodbye')
}

export async function whoami(http: HttpClient): Promise<IUser> {
  const result = await http.post<IUser>('/whoami')
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function getToken(http: HttpClient, type: TokenType): Promise<IActionToken> {
  const result = await http.get<IActionToken>(`/token/${type}`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}
