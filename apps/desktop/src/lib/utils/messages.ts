import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { openUrl } from '@tauri-apps/plugin-opener'
import { applyEmoji } from '@vex-chat/store'

// Re-export shared utilities so existing imports keep working
export {
  chunkMessages,
  parseFileExtra,
  isImageType,
  formatFileSize,
  formatTime,
} from '@vex-chat/store'
export type { MessageChunk, FileAttachment } from '@vex-chat/store'

// ── Platform-specific: HTML rendering (requires DOM + marked + DOMPurify) ───

marked.use({ breaks: true })

/**
 * Renders message content: emoji → markdown → sanitized HTML.
 * External links get a `data-external` attribute for native-browser interception.
 * Safe to use with {@html} in Svelte.
 */
export function renderContent(content: string): string {
  const withEmoji = applyEmoji(content)
  const raw = marked.parse(withEmoji) as string
  // Annotate <a> tags with data-external so handleLinkClick can intercept them
  const annotated = raw.replace(/<a\s+href="([^"]+)"/g, '<a href="$1" data-external="$1"')
  return DOMPurify.sanitize(annotated, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'code', 'pre', 'blockquote',
      'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'del', 'img'],
    ALLOWED_ATTR: ['href', 'data-external', 'rel', 'src', 'alt'],
  })
}

/**
 * Handles clicks inside the message box. Intercepts data-external links
 * and opens them in the native browser via tauri-plugin-opener.
 */
export function handleLinkClick(e: MouseEvent): void {
  const target = (e.target as Element).closest('[data-external]')
  if (!target) return
  e.preventDefault()
  const url = target.getAttribute('data-external')
  if (url) openUrl(url).catch(console.error)
}
