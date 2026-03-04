import { atom } from 'nanostores'
import type { VexClient } from '@vex-chat/libvex'

/** Singleton VexClient instance. Null until bootstrap() is called. */
export const $client = atom<VexClient | null>(null)
