import type { IDevice, IKeyBundle } from '@vex-chat/types'
import type { HttpClient } from './http.ts'

export async function listDevices(http: HttpClient, userID: string): Promise<IDevice[]> {
  const result = await http.get<IDevice[]>(`/users/${userID}/devices`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}

export async function fetchKeyBundle(http: HttpClient, deviceID: string): Promise<IKeyBundle> {
  const result = await http.get<IKeyBundle>(`/keys/${deviceID}`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}
