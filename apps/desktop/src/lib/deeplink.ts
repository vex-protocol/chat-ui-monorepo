import { onOpenUrl } from '@tauri-apps/plugin-deep-link'
import { push } from 'svelte-spa-router'

/**
 * Parses a vex:// URL and navigates to the appropriate route.
 *
 * Supported schemes:
 *   vex://invite/<inviteID>  — navigate to invite acceptance flow
 *   vex://user/<userID>      — navigate to DM with user
 *   vex://server/<serverID>  — navigate to server
 */
function handleDeepLink(url: string): void {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return
  }

  // URL constructor treats vex://invite/abc as host=invite, pathname=/abc
  const host = parsed.hostname
  const segments = parsed.pathname.split('/').filter(Boolean)

  if (host === 'invite' && segments[0]) {
    push(`/invite/${segments[0]}`)
  } else if (host === 'user' && segments[0]) {
    push(`/messaging/${segments[0]}`)
  } else if (host === 'server' && segments[0]) {
    push(`/server/${segments[0]}`)
  }
}

/**
 * Registers the deep-link listener. Returns an unsubscribe function.
 */
export async function setupDeepLinks(): Promise<() => void> {
  const unlisten = await onOpenUrl((urls) => {
    for (const url of urls) {
      handleDeepLink(url)
    }
  })
  return unlisten
}
