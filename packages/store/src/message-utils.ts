import type { DecryptedMail } from '@vex-chat/types'

// ── Avatar hue ───────────────────────────────────────────────────────────────

/** Deterministic hue (0–359) from any string (userID, serverID, etc.) for avatar backgrounds. */
export function avatarHue(id: string): number {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h) % 360
}

// ── File attachment parsing ──────────────────────────────────────────────────

export interface FileAttachment {
  fileID: string
  fileName: string
  fileSize: number
  contentType: string
}

export function parseFileExtra(extra: string | null): FileAttachment | null {
  if (!extra) return null
  try {
    const obj = JSON.parse(extra)
    if (obj && typeof obj.fileID === 'string' && typeof obj.fileName === 'string') {
      return obj as FileAttachment
    }
  } catch { /* not file JSON */ }
  return null
}

export function isImageType(contentType: string): boolean {
  return contentType.startsWith('image/')
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

// ── Message chunking ─────────────────────────────────────────────────────────

export interface MessageChunk {
  authorID: string
  messages: DecryptedMail[]
  firstTime: string
}

const CHUNK_GAP_MS = 5 * 60 * 1000 // 5 minutes
const MAX_CHUNK_SIZE = 100

/**
 * Groups messages by sender into display chunks.
 * Starts a new chunk on: different sender, >5 min gap, or 100 message cap.
 */
export function chunkMessages(messages: DecryptedMail[]): MessageChunk[] {
  const sorted = [...messages].sort((a, b) => a.time.localeCompare(b.time))
  const chunks: MessageChunk[] = []

  for (const msg of sorted) {
    const last = chunks[chunks.length - 1]
    const lastMsg = last?.messages[last.messages.length - 1]

    const sameAuthor = last?.authorID === msg.authorID
    const withinGap = lastMsg
      ? Date.parse(msg.time) - Date.parse(lastMsg.time) < CHUNK_GAP_MS
      : false
    const notFull = (last?.messages.length ?? 0) < MAX_CHUNK_SIZE

    // System messages always get their own chunk
    if (msg.mailType === 'system') {
      chunks.push({ authorID: msg.authorID, messages: [msg], firstTime: msg.time })
    } else if (last && sameAuthor && withinGap && notFull && last.messages[0]?.mailType !== 'system') {
      last.messages.push(msg)
    } else {
      chunks.push({ authorID: msg.authorID, messages: [msg], firstTime: msg.time })
    }
  }

  return chunks
}

// ── Emoji shortcodes ────────────────────────────────────────────────────────

const EMOJI: Record<string, string> = {
  smile: '😊', grin: '😁', laugh: '😂', joy: '😂', heart: '❤️',
  thumbsup: '👍', '+1': '👍', thumbsdown: '👎', '-1': '👎',
  fire: '🔥', rocket: '🚀', wave: '👋', check: '✅', x: '❌',
  star: '⭐', eyes: '👀', tada: '🎉', clap: '👏', pray: '🙏',
  muscle: '💪', cool: '😎', think: '🤔', shrug: '🤷', ok: '👌',
  zzz: '😴', cry: '😢', angry: '😠', confused: '😕', dizzy: '😵',
}

/** Replaces :shortcode: with emoji characters. */
export function applyEmoji(text: string): string {
  return text.replace(/:(\w[+\w-]*):/g, (m, name) => EMOJI[name] ?? m)
}

// ── Date formatting ─────────────────────────────────────────────────────────

/**
 * Formats an ISO timestamp for display.
 * Same day → "HH:mm". Earlier → "MMM D HH:mm".
 */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hhmm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  if (sameDay) return hhmm
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + hhmm
}
