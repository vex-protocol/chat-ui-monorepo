import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { DecryptedMail } from '@vex-chat/types'
import { playNotify } from './sounds.js'

/** Minimal interface needed to subscribe/unsubscribe to mail events. */
interface MailEventEmitter {
  on(event: 'mail', handler: (mail: DecryptedMail) => void): void
  off(event: 'mail', handler: (mail: DecryptedMail) => void): void
}

// ── Preference ────────────────────────────────────────────────────────────────

const NOTIF_KEY = 'vex-notifications-enabled'

export function getNotificationsEnabled(): boolean {
  return localStorage.getItem(NOTIF_KEY) !== 'false'
}

export function setNotificationsEnabled(enabled: boolean): void {
  localStorage.setItem(NOTIF_KEY, String(enabled))
}

// ── Permission ────────────────────────────────────────────────────────────────

async function ensurePermission(): Promise<boolean> {
  try {
    let granted = await isPermissionGranted()
    if (!granted) {
      const result = await requestPermission()
      granted = result === 'granted'
    }
    return granted
  } catch {
    return false
  }
}

// ── Core notify ───────────────────────────────────────────────────────────────

async function notify(title: string, body: string): Promise<void> {
  if (!getNotificationsEnabled()) return

  // Don't notify while the window is focused
  try {
    const focused = await getCurrentWindow().isFocused()
    if (focused) {
      playNotify()
      return
    }
  } catch {
    // If we can't check focus, proceed with notification
  }

  playNotify()

  const granted = await ensurePermission()
  if (granted) {
    sendNotification({ title, body: body.length > 100 ? body.slice(0, 97) + '…' : body })
  }
}

// ── Wire up to VexClient ──────────────────────────────────────────────────────

/**
 * Attaches a mail listener to the client that fires desktop notifications
 * for incoming messages not authored by the current user.
 * Returns an unsubscribe function.
 *
 * @param resolveChannelName - Optional lookup from channelID to display name.
 *   When omitted, group notifications fall back to "Group message".
 */
export function setupNotifications(
  client: MailEventEmitter,
  currentUserID: string,
  resolveChannelName?: (channelID: string) => string | undefined,
): () => void {
  const handler = (mail: DecryptedMail): void => {
    if (mail.authorID === currentUserID) return  // don't notify for own messages
    const title = mail.group
      ? `#${resolveChannelName?.(mail.group) ?? 'channel'}`
      : mail.authorID
    void notify(title, mail.content)
  }

  client.on('mail', handler)
  return () => { client.off('mail', handler) }
}
