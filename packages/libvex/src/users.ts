import type { IUser } from '@vex-chat/types'
import type { HttpClient } from './http.ts'
import { normalizeUser } from './wire.ts'

export async function getUser(http: HttpClient, userID: string): Promise<IUser | null> {
  const result = await http.get<Record<string, unknown>>(`/user/${userID}`)
  if (!result.ok) return null
  return normalizeUser(result.data)
}

/** Returns true if the username is already registered. No auth required. */
export async function isUsernameTaken(http: HttpClient, username: string): Promise<boolean> {
  const result = await http.get<Record<string, unknown>>(`/user/${username}`)
  return result.ok
}

/**
 * Search users by username. Old spire has no search endpoint,
 * so we fall back to an exact username lookup via GET /user/:username.
 */
export async function searchUsers(http: HttpClient, query: string): Promise<IUser[]> {
  const trimmed = query.trim()
  if (!trimmed) return []

  // Try exact username lookup (the only endpoint old spire supports)
  const result = await http.get<Record<string, unknown>>(`/user/${trimmed}`)
  if (result.ok && result.data) {
    return [normalizeUser(result.data)]
  }
  return []
}
