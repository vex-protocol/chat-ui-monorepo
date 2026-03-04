import { map } from 'nanostores'
import type { IUser } from '@vex-chat/types'

/**
 * Online users per channel, keyed by channelID.
 * Populated by server presence events (when the WS protocol supports them).
 */
export const $onlineLists = map<Record<string, IUser[]>>({})
