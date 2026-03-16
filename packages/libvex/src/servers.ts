import type { IServer, IChannel, IUser } from '@vex-chat/types'
import type { HttpClient } from './http.ts'
import { normalizeServer, normalizeUser } from './wire.ts'

export async function createServer(
  http: HttpClient,
  name: string,
  _icon: string,
): Promise<IServer> {
  // Old spire uses POST /server/:name where name is base64-encoded
  const b64Name = btoa(name)
  const result = await http.post<Record<string, unknown>>(`/server/${b64Name}`)
  if (!result.ok) throw new Error(result.error.message)
  return normalizeServer(result.data)
}

export async function listServers(http: HttpClient, userID: string): Promise<IServer[]> {
  const result = await http.get<Record<string, unknown>[]>(`/user/${userID}/servers`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data.map(normalizeServer)
}

export async function listChannels(http: HttpClient, serverID: string): Promise<IChannel[]> {
  const result = await http.get<IChannel[]>(`/server/${serverID}/channels`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function deleteServer(http: HttpClient, serverID: string): Promise<void> {
  const result = await http.delete<unknown>(`/server/${serverID}`)
  if (!result.ok) throw new Error(result.error.message)
}

export async function createChannel(
  http: HttpClient,
  serverID: string,
  name: string,
): Promise<IChannel> {
  const result = await http.post<IChannel>(`/server/${serverID}/channels`, { name })
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function deleteChannel(http: HttpClient, channelID: string): Promise<void> {
  const result = await http.delete<unknown>(`/channel/${channelID}`)
  if (!result.ok) throw new Error(result.error.message)
}

export async function listMembers(http: HttpClient, serverID: string): Promise<IUser[]> {
  // Old spire uses POST /userList/:channelID — we pass serverID and it resolves via permissions
  const result = await http.post<Record<string, unknown>[]>(`/userList/${serverID}`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data.map(normalizeUser)
}
