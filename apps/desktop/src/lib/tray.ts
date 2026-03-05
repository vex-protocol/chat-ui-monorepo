import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'
import type { DecryptedMail } from '@vex-chat/types'

interface MailEmitter {
  on(event: 'mail', handler: (mail: DecryptedMail) => void): void
  off(event: 'mail', handler: (mail: DecryptedMail) => void): void
}

/**
 * Tracks unread messages and updates the tray tooltip via the set_tray_unread
 * Tauri command. Resets when the window gains focus.
 * Returns an unsubscribe / cleanup function.
 */
export function setupTray(client: MailEmitter, currentUserID: string): () => void {
  const win = getCurrentWindow()
  let count = 0
  let unlistenFocus: (() => void) | undefined

  // Focus → clear unread badge
  void win
    .listen('tauri://focus', () => {
      if (count === 0) return
      count = 0
      void invoke('set_tray_unread', { count: 0 })
    })
    .then((fn) => {
      unlistenFocus = fn
    })

  // New mail → increment badge if window is not focused
  const mailHandler = (mail: DecryptedMail): void => {
    if (mail.authorID === currentUserID) return
    void win.isFocused().then((focused) => {
      if (!focused) {
        count++
        void invoke('set_tray_unread', { count })
      }
    })
  }

  client.on('mail', mailHandler)

  return () => {
    client.off('mail', mailHandler)
    unlistenFocus?.()
  }
}
