/**
 * mail.ts — Encrypted mail send/receive for old spire.
 *
 * Uses spire-wire.ts to translate between our X3DH-lite IMail format
 * and old spire's binary wire format.
 */
import { v4 as uuidv4 } from 'uuid'
import { decodeHex } from '@vex-chat/crypto'
import type { IMail, DecryptedMail } from '@vex-chat/types'
import type { HttpClient } from './http.ts'
import type { SessionManager, MailMeta } from './session.ts'
import type { VexError } from './errors.ts'
import { normalizeKeyBundle } from './wire.ts'
import { toSpireWireMail, fromSpireWireTuple } from './spire-wire.ts'

export type SendResult =
  | { ok: true; mail: IMail }
  | { ok: false; error: VexError }

/**
 * Encrypts content and sends it over WebSocket as an old spire resource frame.
 * Falls back to HTTP POST for future servers.
 */
export async function sendMailEncrypted(
  http: HttpClient,
  session: SessionManager,
  content: string,
  meta: MailMeta,
  sendResource?: (transmissionID: string, resourceType: string, action: string, data: unknown) => void,
): Promise<SendResult> {
  // Fetch recipient's key bundle for X3DH
  const bundleResult = await http.post<Record<string, unknown>>(`/device/${meta.recipientDeviceID}/keyBundle`)
  if (!bundleResult.ok) {
    return { ok: false, error: bundleResult.error }
  }
  const bundle = normalizeKeyBundle(bundleResult.data)

  // Encrypt with our X3DH-lite SessionManager → produces IMail with hex fields
  const mailID = uuidv4()
  const payload: IMail = {
    mailID,
    time: new Date().toISOString(),
    ...session.encryptMail(content, bundle, meta),
  }

  if (sendResource) {
    // Translate to old spire wire format and send over WebSocket
    const wirePayload = toSpireWireMail(payload, meta.senderDeviceID)
    const transmissionID = uuidv4()
    // Frame header: zeros (we skip HMAC — Poly1305 provides authentication)
    sendResource(transmissionID, 'mail', 'CREATE', wirePayload)
    return { ok: true, mail: payload }
  }

  // Fallback: HTTP POST (future servers)
  const result = await http.post<IMail>('/mail', payload)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, mail: result.data }
}

/**
 * Fetches pending mail from old spire, translates from wire format, and decrypts.
 *
 * Old spire returns [[frameHeader, mail, timestamp], ...] (msgpack).
 * The sender's signKey and ephemeral key are extracted from the `extra` field,
 * NOT from `mail.sender` (which is deviceID) or the frame header (which is HMAC).
 */
export async function fetchInboxDecrypted(
  http: HttpClient,
  session: SessionManager | null,
  deviceID: string,
  onDecrypted?: (nonce: Uint8Array) => void,
): Promise<DecryptedMail[]> {
  const result = await http.post<unknown[]>(`/device/${deviceID}/mail`)
  if (!result.ok) return []
  if (!session) return []

  const messages: DecryptedMail[] = []
  for (const entry of result.data) {
    try {
      const tuple = entry as [unknown, Record<string, unknown>, unknown]
      const mail = fromSpireWireTuple(tuple)
      if (!mail) continue

      const decrypted = session.decrypt(mail)
      if (decrypted) {
        messages.push(decrypted)
        // Notify caller (e.g. to send receipt) with the original wire nonce
        onDecrypted?.(decodeHex(mail.nonce))
      }
    } catch {
      // Skip messages that fail to process
    }
  }
  return messages
}
