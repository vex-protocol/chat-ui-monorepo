import type { KeyStore } from '@vex-chat/types'
import { $client } from './client.ts'
import { $user } from './user.ts'

export interface SendDMOptions {
  /** Pre-uploaded file attachment metadata (mailType + extra JSON). */
  mailType?: string
  extra?: string | null
  /** KeyStore to look up current deviceID for multi-device forwarding. */
  keyStore?: KeyStore
}

export interface SendDMResult {
  ok: boolean
  error?: string
}

/**
 * Sends a direct message to a user, handling the full flow:
 *   1. Sends to ALL recipient devices (not just the first)
 *   2. Forwards to sender's own other devices so sent messages appear everywhere
 *
 * The server delivers the message back to the sender via WebSocket/mail-notify,
 * so the bootstrap mail handler in bootstrap.ts adds it to $messages automatically.
 * No local echo needed — avoids duplicates.
 */
export async function sendDirectMessage(
  recipientUserID: string,
  content: string,
  options?: SendDMOptions,
): Promise<SendDMResult> {
  const client = $client.get()
  const me = $user.get()
  if (!client || !me) return { ok: false, error: 'Not connected' }

  const mailType = options?.mailType ?? 'text'
  const extra = options?.extra ?? null
  const sendOpts = { mailType, extra }

  // 1. Send to ALL recipient devices
  const devices = await client.listDevices(recipientUserID)
  if (devices.length === 0) {
    return { ok: false, error: 'Recipient has no registered devices.' }
  }

  const results = await Promise.allSettled(
    devices.map(d => client.sendMail(content, d.deviceID, recipientUserID, sendOpts)),
  )
  const anyOk = results.some(r => r.status === 'fulfilled' && r.value.ok)
  if (!anyOk) {
    const first = results.find(r => r.status === 'fulfilled' && !r.value.ok) as
      | PromiseFulfilledResult<{ ok: false; error: { message: string } }>
      | undefined
    return { ok: false, error: first?.value.error.message ?? 'Failed to send to any device' }
  }

  // 2. Forward to sender's own other devices
  if (options?.keyStore) {
    try {
      const creds = await options.keyStore.loadActive()
      if (creds) {
        const myDevices = await client.listDevices(me.userID)
        const otherDevices = myDevices.filter(d => d.deviceID !== creds.deviceID)
        if (otherDevices.length > 0) {
          await Promise.allSettled(
            otherDevices.map(d => client.sendMail(content, d.deviceID, recipientUserID, sendOpts)),
          )
        }
      }
    } catch {
      // Non-fatal — message was sent successfully, just not forwarded to own devices
    }
  }

  return { ok: true }
}
