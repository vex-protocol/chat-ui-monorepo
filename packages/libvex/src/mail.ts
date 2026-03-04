import type { IMail } from '@vex-chat/types'
import type { HttpClient } from './http.ts'
import type { VexError } from './errors.ts'

export type SendResult =
  | { ok: true; mail: IMail }
  | { ok: false; error: VexError }

export async function sendMail(http: HttpClient, payload: IMail): Promise<SendResult> {
  const result = await http.post<IMail>('/mail', payload)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, mail: result.data }
}

export async function fetchInbox(http: HttpClient, deviceID: string): Promise<IMail[]> {
  const result = await http.get<IMail[]>(`/mail/${deviceID}`)
  if (!result.ok) throw new Error(result.error.message)
  return result.data
}
