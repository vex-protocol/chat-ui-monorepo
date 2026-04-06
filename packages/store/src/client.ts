import { atom } from 'nanostores'
import type { Client } from '@vex-chat/libvex'

/** Singleton Client instance. Null until bootstrap() is called. */
export const $client = atom<Client | null>(null)
