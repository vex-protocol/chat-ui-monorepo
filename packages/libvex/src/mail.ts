import type { IMail, DecryptedMail, IKeyBundle } from '@vex-chat/types'
import type { HttpClient } from './http.ts'
import type { SessionManager, MailMeta } from './session.ts'
import type { VexError } from './errors.ts'

export type SendResult =
  | { ok: true; mail: IMail }
  | { ok: false; error: VexError }

/**
 * Encrypts `content` for the recipient and POSTs it to /mail.
 * Fetches the recipient's key bundle internally.
 */
export async function sendMailEncrypted(
  http: HttpClient,
  session: SessionManager,
  content: string,
  meta: MailMeta,
): Promise<SendResult> {
  // Fetch recipient's key bundle for X3DH
  const bundleResult = await http.get<IKeyBundle>(`/keys/${meta.recipientDeviceID}`)
  if (!bundleResult.ok) {
    return { ok: false, error: bundleResult.error }
  }
  const bundle = bundleResult.data

  // Build encrypted mail payload (server assigns mailID + time)
  const mailID = globalThis.crypto.randomUUID()
  const payload: IMail = {
    mailID,
    time: new Date().toISOString(),
    ...session.encryptMail(content, bundle, meta),
  }

  const result = await http.post<IMail>('/mail', payload)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, mail: result.data }
}

/**
 * Fetches pending mail for a device from the server, decrypts each message,
 * and returns successfully decrypted messages (failed decryptions are skipped).
 */
export async function fetchInboxDecrypted(
  http: HttpClient,
  session: SessionManager | null,
  deviceID: string,
): Promise<DecryptedMail[]> {
  // Old spire uses POST /device/:id/mail
  const result = await http.post<IMail[]>(`/device/${deviceID}/mail`)
  if (!result.ok) return []
  if (!session) return []

  return result.data
    .map(mail => session.decrypt(mail))
    .filter((m): m is DecryptedMail => m !== null)
}
