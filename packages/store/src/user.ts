import { atom } from 'nanostores'
import type { IUser } from '@vex-chat/types'

/** The currently authenticated user. Null if not logged in. */
export const $user = atom<IUser | null>(null)
