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
    await client.messages.group(channelID, content)
  } catch (err: any) {
    return { ok: false, error: err?.message ?? 'Failed to send message' }
  }

  // Local echo
  const sentMsg: IMessage = {
    nonce: '',
    mailID: SENT_PREFIX + uuidv4(),
    sender: '',
    recipient: '',
    message: content,
    direction: 'outgoing',
    timestamp: new Date(),
    decrypted: true,
    group: channelID,
    forward: false,
    authorID: me.userID,
    readerID: me.userID,
  }
  const prev = $groupMessages.get()[channelID] ?? []
  $groupMessages.setKey(channelID, [...prev, sentMsg])

  return { ok: true }
}
