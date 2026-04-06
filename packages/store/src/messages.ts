import { map } from 'nanostores'
import type { IMessage } from '@vex-chat/libvex'

/**
 * Direct messages, keyed by the other party's userID.
 * Updated in real-time by the 'message' WebSocket event (where msg.group is null).
 */
export const $messages = map<Record<string, IMessage[]>>({})

/**
 * Group/channel messages, keyed by channelID (msg.group).
 * Updated in real-time by the 'message' WebSocket event (where msg.group is non-null).
 */
export const $groupMessages = map<Record<string, IMessage[]>>({})
