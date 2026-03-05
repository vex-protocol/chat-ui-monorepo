import notifee, { AndroidImportance, EventType } from '@notifee/react-native'
import { AppState } from 'react-native'
import type { DecryptedMail } from '@vex-chat/types'
import { $user, $familiars } from '../store'
import { navigateToConversation } from '../navigation/navigationRef'

const CHANNEL_ID = 'vex-messages'

let channelReady = false

async function ensureChannel(): Promise<void> {
  if (channelReady) return
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Messages',
    importance: AndroidImportance.HIGH,
    sound: 'default',
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
    data: {
      authorID: mail.authorID,
      username: author?.username ?? mail.authorID,
    },
    android: {
      channelId: CHANNEL_ID,
      pressAction: { id: 'default' },
      sound: 'default',
    },
    ios: {
      sound: 'default',
    },
  })
}

function handleNotificationPress(data: Record<string, string | number | object> | undefined): void {
  if (!data?.authorID || !data?.username) return
  navigateToConversation(String(data.authorID), String(data.username))
}

export function setupNotificationHandlers(): () => void {
  // Foreground events (app is open, user taps notification from notification center)
  const unsubForeground = notifee.onForegroundEvent(({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNotificationPress(detail.notification?.data)
    }
  })

  // Background/killed events (app was closed or backgrounded)
  notifee.onBackgroundEvent(async ({ type, detail }) => {
    if (type === EventType.PRESS) {
      handleNotificationPress(detail.notification?.data)
    }
  })

  return unsubForeground
}
