import notifee, { AndroidImportance } from '@notifee/react-native'
import { AppState } from 'react-native'
import type { DecryptedMail } from '@vex-chat/types'
import { $user, $familiars } from '../store'

const CHANNEL_ID = 'vex-messages'

let channelReady = false

async function ensureChannel(): Promise<void> {
  if (channelReady) return
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Messages',
    importance: AndroidImportance.HIGH,
  })
  channelReady = true
}

export async function requestNotificationPermission(): Promise<boolean> {
  const settings = await notifee.requestPermission()
  // authorizationStatus 1 = AUTHORIZED, 2 = PROVISIONAL
  return settings.authorizationStatus >= 1
}

export async function showMessageNotification(mail: DecryptedMail): Promise<void> {
  // Don't notify for own messages
  const me = $user.get()
  if (me && mail.authorID === me.userID) return

  // Don't notify when app is in foreground (user is looking at it)
  if (AppState.currentState === 'active') return

  await ensureChannel()

  const familiars = $familiars.get()
  const author = familiars[mail.authorID]
  const title = author?.username ?? 'New message'
  const body = mail.content.length > 100
    ? mail.content.slice(0, 100) + '...'
    : mail.content

  await notifee.displayNotification({
    title,
    body,
    android: { channelId: CHANNEL_ID, pressAction: { id: 'default' } },
  })
}
