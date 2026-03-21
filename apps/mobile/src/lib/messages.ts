/**
 * Local message persistence for React Native using AsyncStorage.
 *
 * Privacy model: spire deletes messages after the client sends a receipt,
 * so we must save locally before receipting. This module stores messages
 * keyed by thread (channelID for groups, userID for DMs).
 */
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { DecryptedMail } from '@vex-chat/types'

const GROUP_KEY = 'vex:groupMessages'
const DM_KEY = 'vex:dmMessages'
const FAMILIARS_KEY = 'vex:familiars'

export async function saveGroupMessages(groups: Record<string, DecryptedMail[]>): Promise<void> {
  await AsyncStorage.setItem(GROUP_KEY, JSON.stringify(groups))
}

export async function saveDmMessages(dms: Record<string, DecryptedMail[]>): Promise<void> {
  await AsyncStorage.setItem(DM_KEY, JSON.stringify(dms))
}

export async function loadMessages(): Promise<{
  groups: Record<string, DecryptedMail[]>
  dms: Record<string, DecryptedMail[]>
}> {
  const [groupsRaw, dmsRaw] = await Promise.all([
    AsyncStorage.getItem(GROUP_KEY),
    AsyncStorage.getItem(DM_KEY),
  ])
  return {
    groups: groupsRaw ? JSON.parse(groupsRaw) : {},
    dms: dmsRaw ? JSON.parse(dmsRaw) : {},
  }
}

export async function clearMessages(): Promise<void> {
  await Promise.all([
    AsyncStorage.removeItem(GROUP_KEY),
    AsyncStorage.removeItem(DM_KEY),
  ])
}

// ── Familiars persistence ─────────────────────────────────────────────────────

import type { IUser } from '@vex-chat/types'

export async function saveFamiliars(familiars: Record<string, IUser>): Promise<void> {
  await AsyncStorage.setItem(FAMILIARS_KEY, JSON.stringify(familiars))
}

export async function loadFamiliars(): Promise<Record<string, IUser>> {
  const raw = await AsyncStorage.getItem(FAMILIARS_KEY)
  return raw ? JSON.parse(raw) : {}
}
