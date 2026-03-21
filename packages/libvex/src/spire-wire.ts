/**
 * spire-wire.ts — Wire format adapter between new libvex IMail (hex strings)
 * and old spire's WS.IMail (Uint8Array fields, packed extra).
 *
 * See docs/explanation/migration-from-upstream.md for the full API surface.
 */
import { encodeHex, decodeHex } from '@vex-chat/crypto'
import { parse as uuidParse, stringify as uuidStringify } from 'uuid'
import type { IMail } from '@vex-chat/types'

// ── Pack / Unpack the `extra` field ─────────────────────────────────────────

/**
 * Pack sender signKey + ephemeral key into old spire's 170-byte `extra` format.
 *
 * Layout: [signKey(32)|ephKey(32)|zeros(32)|zeros(68)|otkIndex(6)]
 * PK, AD, and OTK index are zeroed — only new libvex clients will decrypt,
 * and they extract signKey + ephKey directly.
 */
export function packExtra(signKeyHex: string, ephemeralKeyHex: string): Uint8Array {
  const extra = new Uint8Array(170)
  extra.set(decodeHex(signKeyHex), 0)       // [0:32]  sender Ed25519 pubkey
  extra.set(decodeHex(ephemeralKeyHex), 32)  // [32:64] ephemeral X25519 pubkey
  // [64:170] reserved / AD / OTK index — left as zeros
  return extra
}

/**
 * Unpack old spire's `extra` field to extract sender signKey and ephemeral key.
 *
 * Returns hex strings suitable for SessionManager.decrypt().
 * Returns null for subsequent messages (mailType=1) since we don't support sessions.
 */
export function unpackExtra(
  extra: Uint8Array,
  mailType: number | string,
): { signKeyHex: string; ephemeralKeyHex: string } | null {
  const type = typeof mailType === 'string' ? parseInt(mailType, 10) : mailType

  // Subsequent messages (type=1): only 32 bytes (session public key). We can't decrypt these.
  if (type === 1 || extra.length < 64) return null

  const signKey = extra.slice(0, 32)
  const ephemeralKey = extra.slice(32, 64)

  // Check they're not all zeros (corrupt)
  if (signKey.every(b => b === 0) || ephemeralKey.every(b => b === 0)) return null

  return {
    signKeyHex: encodeHex(signKey),
    ephemeralKeyHex: encodeHex(ephemeralKey),
  }
}

// ── Send: IMail (hex) → spire wire format ───────────────────────────────────

/**
 * Convert our internal IMail to old spire's WS.IMail wire format for sending
 * over WebSocket as a resource CREATE frame.
 *
 * @param mail - Our IMail with hex-encoded crypto fields
 * @param senderDeviceID - Sender's device UUID (spire expects this as `sender`)
 */
export function toSpireWireMail(
  mail: IMail,
  senderDeviceID: string,
): Record<string, unknown> {
  return {
    mailID: mail.mailID,
    mailType: 0, // always initial — we use fresh ephemeral keys per message
    sender: senderDeviceID,
    recipient: mail.recipient,
    cipher: decodeHex(mail.cipher),
    nonce: decodeHex(mail.nonce),
    extra: packExtra(mail.sender, mail.header),
    group: mail.group ? new Uint8Array(uuidParse(mail.group)) : null,
    forward: false,
    authorID: mail.authorID,
    readerID: mail.readerID,
  }
}

// ── Receive: spire wire format → IMail (hex) ────────────────────────────────

/**
 * Convert a single entry from old spire's fetchMail response tuple into our IMail.
 *
 * @param tuple - [frameHeader(Uint8Array), mailObject, timestamp] from retrieveMail
 * @returns IMail with hex strings, or null if unparseable
 */
export function fromSpireWireTuple(tuple: [unknown, Record<string, unknown>, unknown]): IMail | null {
  const raw = tuple[1]
  if (!raw) return null

  // Extract crypto material from `extra` field (NOT from frame header or sender)
  const extra = raw['extra'] as Uint8Array | null
  if (!extra || !(extra instanceof Uint8Array)) return null

  const mailType = raw['mailType'] ?? 0
  const keys = unpackExtra(extra, mailType as number)
  if (!keys) return null // can't decrypt subsequent messages

  // Parse timestamp
  const ts = tuple[2]
  const time = ts instanceof Date ? ts.toISOString()
    : typeof ts === 'string' ? ts
    : new Date().toISOString()

  // Parse group: Uint8Array(16) → UUID string
  const groupRaw = raw['group']
  let group: string | null = null
  if (groupRaw instanceof Uint8Array && groupRaw.length >= 16) {
    group = uuidStringify(groupRaw)
  } else if (typeof groupRaw === 'string') {
    group = groupRaw
  }

  // Parse extra content (application-level extra, not crypto extra)
  // In old spire, extra carries the crypto material. Application extra is not used.
  const extraContent: string | null = null

  return {
    mailID: raw['mailID'] as string,
    mailType: String(raw['mailType'] ?? 'message'),
    sender: keys.signKeyHex,           // from extra[0:32], NOT raw['sender'] (which is deviceID)
    recipient: raw['recipient'] as string,
    header: keys.ephemeralKeyHex,      // from extra[32:64], NOT from frame header (which is HMAC)
    nonce: toHex(raw['nonce']),
    cipher: toHex(raw['cipher']),
    group,
    extra: extraContent,
    forward: raw['forward'] ? String(raw['forward']) : null,
    authorID: raw['authorID'] as string,
    readerID: raw['readerID'] as string,
    time,
  }
}

/** Convert a value to hex string if it's a Uint8Array. */
function toHex(v: unknown): string {
  if (v instanceof Uint8Array) return encodeHex(v)
  if (typeof v === 'string') return v
  return String(v)
}
