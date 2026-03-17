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
 * Search users by username. Old spire has no search endpoint —
 * returns an empty array gracefully.
 */
export async function searchUsers(_http: HttpClient, _query: string): Promise<IUser[]> {
  // Old spire does not have GET /users/search — return empty rather than error
  return []
}
