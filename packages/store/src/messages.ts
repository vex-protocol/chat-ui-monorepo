import { map } from 'nanostores'
import type { DecryptedMail } from '@vex-chat/types'

/**
 * Direct messages, keyed by the other party's userID.
 * Updated in real-time by the 'mail' WebSocket event (where mail.group is null).
 */
export const $messages = map<Record<string, DecryptedMail[]>>({})

/**
 * Group/channel messages, keyed by channelID (mail.group).
 * Updated in real-time by the 'mail' WebSocket event (where mail.group is non-null).
 */
export const $groupMessages = map<Record<string, DecryptedMail[]>>({})
