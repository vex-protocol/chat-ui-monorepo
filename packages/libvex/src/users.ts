import type { IUser } from '@vex-chat/types'
import type { HttpClient } from './http.ts'

export async function getUser(http: HttpClient, userID: string): Promise<IUser | null> {
  const result = await http.get<IUser>(`/user/${userID}`)
  if (!result.ok) return null
  return result.data
}

export async function searchUsers(http: HttpClient, query: string): Promise<IUser[]> {
  const result = await http.get<IUser[]>(`/users/search?q=${encodeURIComponent(query)}`)
  if (!result.ok) return []
  return result.data
}
