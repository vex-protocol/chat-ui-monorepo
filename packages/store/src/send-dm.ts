import { v4 as uuidv4 } from 'uuid'
import type { IMessage } from '@vex-chat/libvex'
import { $client } from './client.ts'
import { $user } from './user.ts'
import { $messages } from './messages.ts'

/** Prefix for locally-echoed sent messages. If the server echoes back, the
 *  bootstrap message handler replaces the local version with the server version. */
export const SENT_PREFIX = 'sent-'

export interface SendDMOptions {
  /** Pre-uploaded file attachment metadata (mailType + extra JSON). */
  mailType?: string
  extra?: string | null
}

export interface SendDMResult {
  ok: boolean
  error?: string
}

/**
 * Sends a direct message to a user.
 * Client.messages.send() handles multi-device delivery and forwarding internally.
 * We echo the message locally so the UI updates immediately.
 */
export async function sendDirectMessage(
  recipientUserID: string,
  content: string,
  options?: SendDMOptions,
): Promise<SendDMResult> {
  const client = $client.get()
  const me = $user.get()
  if (!client || !me) return { ok: false, error: 'Not connected' }

  try {
    // Client.messages.send() emits a "message" event with the outgoing
    // message, which bootstrap.ts adds to $messages. No local echo needed.
    await client.messages.send(recipientUserID, content)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to send message' }
  }
}
