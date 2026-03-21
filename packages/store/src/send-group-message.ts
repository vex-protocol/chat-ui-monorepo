import { v4 as uuidv4 } from 'uuid'
import type { DecryptedMail, KeyStore } from '@vex-chat/types'
import { $client } from './client.ts'
import { $user } from './user.ts'
import { $groupMessages } from './messages.ts'
import { SENT_PREFIX } from './send-dm.ts'

export interface SendGroupMessageOptions {
  /** Pre-uploaded file attachment metadata (mailType + extra JSON). */
  mailType?: string
  extra?: string | null
  /** KeyStore to look up current deviceID so we skip sending to ourselves. */
  keyStore?: KeyStore
}

export interface SendGroupMessageResult {
  ok: boolean
  error?: string
}

/**
 * Sends a message to a channel, handling the full flow:
 *   1. Enumerates channel members and all their devices
 *   2. Fans out sendMail with { group: channelID } to every device (except sender's current)
 *   3. Echoes the sent message locally with "sent-" prefix
 *
 * If the server also echoes the message back, the bootstrap mail handler
 * replaces the local echo with the server version (dedup by content+author).
 */
export async function sendGroupMessage(
  channelID: string,
  content: string,
  options?: SendGroupMessageOptions,
): Promise<SendGroupMessageResult> {
  const client = $client.get()
  const me = $user.get()
  if (!client || !me) return { ok: false, error: 'Not connected' }

  const mailType = options?.mailType ?? 'text'
  const extra = options?.extra ?? null

  // 1. Enumerate all channel members and their devices
  const members = await client.listMembers(channelID)
  let myDeviceID: string | undefined
  if (options?.keyStore) {
    try {
      const creds = await options.keyStore.loadActive()
      if (creds) myDeviceID = creds.deviceID
    } catch {}
  }

  const deviceTargets: { deviceID: string; userID: string }[] = []
  for (const member of members) {
    const devices = await client.listDevices(member.userID)
    for (const d of devices) {
      // Skip sender's own current device
      if (member.userID === me.userID && myDeviceID && d.deviceID === myDeviceID) continue
      deviceTargets.push({ deviceID: d.deviceID, userID: member.userID })
    }
  }

  if (deviceTargets.length === 0) {
    return { ok: false, error: 'No devices to send to.' }
  }

  // 2. Fan out to all devices
  const sendOpts = { group: channelID, mailType, extra }
  const results = await Promise.allSettled(
    deviceTargets.map(t => client.sendMail(content, t.deviceID, t.userID, sendOpts)),
  )
  const anyOk = results.some(r => r.status === 'fulfilled' && r.value.ok)
  if (!anyOk) {
    return { ok: false, error: 'Failed to send to any device' }
  }

  // 3. Local echo
  const sentMail: DecryptedMail = {
    mailID: SENT_PREFIX + uuidv4(),
    authorID: me.userID,
    readerID: me.userID,
    group: channelID,
    mailType,
    time: new Date().toISOString(),
    content,
    extra,
    forward: null,
  }
  const prev = $groupMessages.get()[channelID] ?? []
  $groupMessages.setKey(channelID, [...prev, sentMail])

  return { ok: true }
}
