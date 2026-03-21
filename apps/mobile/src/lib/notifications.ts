import notifee, { AndroidImportance, EventType } from '@notifee/react-native'
import { AppState } from 'react-native'
import type { DecryptedMail } from '@vex-chat/types'
import { shouldNotify } from '@vex-chat/store'
import { $familiars, $channels, $servers, $client } from '../store'
import { navigateToConversation } from '../navigation/navigationRef'

const CHANNEL_ID = 'vex-messages'

let channelReady = false
let activeConversation: string | null = null

/** Call from screens to track which conversation the user is viewing. */
export function setActiveConversation(key: string | null): void {
  activeConversation = key
}

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
  const appFocused = AppState.currentState === 'active'
  const familiars = $familiars.get()

  // Resolve author name: check familiars first, then fetch from server
  let authorName = familiars[mail.authorID]?.username
  if (!authorName) {
    try {
      const user = await $client.get()?.getUser(mail.authorID)
      if (user) authorName = user.username
    } catch {}
  }

  const channels = $channels.get()
  const servers = $servers.get()
  const payload = shouldNotify(
    mail,
    activeConversation,
    appFocused,
    (id) => id === mail.authorID && authorName ? authorName : familiars[id]?.username,
    (channelID) => {
      for (const [serverID, chs] of Object.entries(channels)) {
        const ch = chs.find(c => c.channelID === channelID)
        if (ch) return { channelName: ch.name, serverName: servers[serverID]?.name ?? 'server' }
      }
      return undefined
    },
  )
  if (!payload) return

  await ensureChannel()

  await notifee.displayNotification({
    title: payload.title,
    body: payload.body,
    data: {
      authorID: payload.authorID,
      username: payload.title,
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
