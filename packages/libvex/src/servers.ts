import type { IServer, IChannel } from '@vex-chat/types'
import type { HttpClient } from './http.ts'

export async function createServer(
  http: HttpClient,
  name: string,
  icon: string,
): Promise<IServer> {
  const result = await http.post<IServer>('/server', { name, icon })
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function listServers(http: HttpClient, userID: string): Promise<IServer[]> {
  const result = await http.get<IServer[]>(`/user/${userID}/servers`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function listChannels(http: HttpClient, serverID: string): Promise<IChannel[]> {
  const result = await http.get<IChannel[]>(`/server/${serverID}/channels`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function deleteServer(http: HttpClient, serverID: string): Promise<void> {
  const result = await http.delete<{ ok: boolean }>(`/server/${serverID}`)
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
  const result = await http.delete<{ ok: boolean }>(`/channel/${channelID}`)
  if (!result.ok) throw new Error(result.error.message)
}
