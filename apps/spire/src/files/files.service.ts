import type { Kysely } from 'kysely'
import type { Database, FilesTable, EmojisTable } from '#db/types.js'

export async function createFile(
  db: Kysely<Database>,
  owner: string,
  nonce: string,
): Promise<FilesTable> {
  throw new Error('not implemented')
}

export async function getFile(
  db: Kysely<Database>,
  fileID: string,
): Promise<FilesTable | null> {
  throw new Error('not implemented')
}

export async function createEmoji(
  db: Kysely<Database>,
  owner: string,
  name: string,
): Promise<EmojisTable> {
  throw new Error('not implemented')
}

export async function getEmoji(
  db: Kysely<Database>,
  emojiID: string,
): Promise<EmojisTable | null> {
  throw new Error('not implemented')
}

export async function getEmojiList(
  db: Kysely<Database>,
  serverID: string,
): Promise<EmojisTable[]> {
  throw new Error('not implemented')
}

export async function deleteEmoji(
  db: Kysely<Database>,
  emojiID: string,
): Promise<void> {
  throw new Error('not implemented')
}

/** Filesystem path for a user-uploaded file. */
export function getFilePath(fileID: string): string {
  throw new Error('not implemented')
}

/** Filesystem path for a user avatar. */
export function getAvatarPath(userID: string): string {
  throw new Error('not implemented')
}

/** Filesystem path for a server emoji image. */
export function getEmojiPath(emojiID: string): string {
  throw new Error('not implemented')
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

/**
 * Returns true if the MIME type is an allowed image type, false otherwise.
 */
export function validateImageMime(mime: string): boolean {
  throw new Error('not implemented')
}

/**
 * Throws if fileSizeBytes exceeds limit.
 */
export function assertUnderLimit(fileSizeBytes: number, limit: number): void {
  throw new Error('not implemented')
}
