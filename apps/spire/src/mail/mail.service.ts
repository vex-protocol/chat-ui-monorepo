import type { Kysely } from 'kysely'
import type { Database, MailTable } from '#db/types.js'
import type { MailPayload } from './mail.schemas.js'
export type { MailPayload } from './mail.schemas.js'

/**
 * Inserts a mail row. All fields are required; missing NOT NULL fields will
 * cause a DB constraint violation.
 *
 * The server stores ciphertext only — callers must never pass plaintext.
 */
export async function saveMail(
  _db: Kysely<Database>,
  _data: MailPayload,
): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Returns all pending mail for a recipient device, then DELETES those rows.
 *
 * Privacy model: the server is a relay, not a store. Messages are deleted
 * from the server the moment the recipient fetches them.
 */
export async function retrieveMail(
  _db: Kysely<Database>,
  _deviceID: string,
): Promise<MailTable[]> {
  throw new Error('not implemented')
}

/**
 * Deletes a single mail row by nonce. Used for explicit deletion paths
 * (e.g. sender-side recall, admin cleanup).
 */
export async function deleteMail(
  _db: Kysely<Database>,
  _nonce: string,
): Promise<void> {
  throw new Error('not implemented')
}
