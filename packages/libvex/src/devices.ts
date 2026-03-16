import type { IDevice, IKeyBundle } from '@vex-chat/types'
import type { HttpClient } from './http.ts'
import { normalizeDevice, normalizeKeyBundle } from './wire.ts'

export async function listDevices(http: HttpClient, userID: string): Promise<IDevice[]> {
  const result = await http.get<Record<string, unknown>[]>(`/user/${userID}/devices`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data.map(normalizeDevice)
}

export async function deleteDevice(http: HttpClient, userID: string, deviceID: string): Promise<void> {
  const result = await http.delete(`/user/${userID}/devices/${deviceID}`)
  if (!result.ok) throw new Error(result.error.message)
}

export async function fetchKeyBundle(http: HttpClient, deviceID: string): Promise<IKeyBundle> {
  // Old spire uses POST /device/:id/keyBundle
  const result = await http.post<Record<string, unknown>>(`/device/${deviceID}/keyBundle`)
  if (!result.ok) throw new Error(result.error.message)
  return normalizeKeyBundle(result.data)
}
