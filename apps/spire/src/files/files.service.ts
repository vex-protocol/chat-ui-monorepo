import { v4 as uuidv4 } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database, FilesTable, EmojisTable } from '#db/types.js'

export async function createFile(
  db: Kysely<Database>,
  owner: string,
  nonce: string,
): Promise<FilesTable> {
  const fileID = uuidv4()
  await db.insertInto('files').values({ fileID, owner, nonce }).execute()
  return { fileID, owner, nonce }
}

export async function getFile(
  db: Kysely<Database>,
  fileID: string,
): Promise<FilesTable | null> {
  const row = await db
    .selectFrom('files')
    .where('fileID', '=', fileID)
    .selectAll()
    .executeTakeFirst()
  return row ?? null
}

export async function createEmoji(
  db: Kysely<Database>,
  owner: string,
  name: string,
): Promise<EmojisTable> {
  const emojiID = uuidv4()
  await db.insertInto('emojis').values({ emojiID, owner, name }).execute()
  return { emojiID, owner, name }
}

export async function getEmoji(
  db: Kysely<Database>,
  emojiID: string,
): Promise<EmojisTable | null> {
  const row = await db
    .selectFrom('emojis')
    .where('emojiID', '=', emojiID)
    .selectAll()
    .executeTakeFirst()
  return row ?? null
}

export async function getEmojiList(
  db: Kysely<Database>,
  serverID: string,
): Promise<EmojisTable[]> {
  return db.selectFrom('emojis').where('owner', '=', serverID).selectAll().execute()
}

export async function deleteEmoji(
  db: Kysely<Database>,
  emojiID: string,
): Promise<void> {
  await db.deleteFrom('emojis').where('emojiID', '=', emojiID).execute()
}

/** Filesystem path for a user-uploaded file. */
export function getFilePath(fileID: string): string {
  return `files/${fileID}`
}

/** Filesystem path for a user avatar. */
export function getAvatarPath(userID: string): string {
  return `avatars/${userID}`
}

/** Filesystem path for a server emoji image. */
export function getEmojiPath(emojiID: string): string {
  return `emojis/${emojiID}`
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp'])

/**
 * Returns true if the MIME type is an allowed image type, false otherwise.
 */
export function validateImageMime(mime: string): boolean {
  return ALLOWED_MIME_TYPES.has(mime)
}

/**
 * Throws if fileSizeBytes exceeds limit.
 */
export function assertUnderLimit(fileSizeBytes: number, limit: number): void {
  if (fileSizeBytes > limit) {
    throw new Error(`File size ${fileSizeBytes} exceeds limit of ${limit} bytes`)
  }
}
