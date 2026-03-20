/**
 * Parses vex:// URLs into structured link objects.
 * Platform apps handle navigation after parsing.
 *
 * Supported schemes:
 *   vex://invite/<inviteID>  — invite acceptance
 *   vex://user/<userID>      — DM with user
 *   vex://server/<serverID>  — open server
 */

export type VexLink =
  | { type: 'invite'; inviteID: string }
  | { type: 'user'; userID: string }
  | { type: 'server'; serverID: string }
  | { type: 'unknown'; raw: string }

export function parseVexLink(url: string): VexLink {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return { type: 'unknown', raw: url }
  }

  // URL constructor treats vex://invite/abc as host=invite, pathname=/abc
  const host = parsed.hostname
  const segments = parsed.pathname.split('/').filter(Boolean)
  const id = segments[0]

  if (host === 'invite' && id) return { type: 'invite', inviteID: id }
  if (host === 'user' && id) return { type: 'user', userID: id }
  if (host === 'server' && id) return { type: 'server', serverID: id }

  return { type: 'unknown', raw: url }
}
