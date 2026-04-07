import { v4 as uuidv4 } from 'uuid'
import type { IMessage } from '@vex-chat/libvex'
import { $client } from './client.ts'
import { $user } from './user.ts'
import { $groupMessages } from './messages.ts'
import { SENT_PREFIX } from './send-dm.ts'

export interface SendGroupMessageOptions {
  /** Pre-uploaded file attachment metadata (mailType + extra JSON). */
  mailType?: string
  extra?: string | null
}

export interface SendGroupMessageResult {
  ok: boolean
  error?: string
}

/**
 * Sends a message to a channel.
 * Client.messages.group() handles member enumeration and multi-device delivery internally.
 * We echo the message locally so the UI updates immediately.
 */
export async function sendGroupMessage(
  channelID: string,
  content: string,
  options?: SendGroupMessageOptions,
): Promise<SendGroupMessageResult> {
  const client = $client.get()
  const me = $user.get()
  if (!client || !me) return { ok: false, error: 'Not connected' }

  try {
    // Client.messages.group() emits a "message" event with the outgoing
    // message, which bootstrap.ts adds to $groupMessages. No local echo needed.
    await client.messages.group(channelID, content)
    return { ok: true }
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to send message' }
  }
}
