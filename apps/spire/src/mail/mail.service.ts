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
  db: Kysely<Database>,
  data: MailPayload,
): Promise<void> {
  await db
    .insertInto('mail')
    .values({
      nonce: data.nonce,
      recipient: data.recipient,
      mailID: data.mailID,
      sender: data.sender,
      header: data.header,
      cipher: data.cipher,
      group: data.group ?? null,
      extra: data.extra ?? null,
      mailType: data.mailType,
      time: data.time,
      forward: data.forward ?? null,
      authorID: data.authorID,
      readerID: data.readerID,
    })
    .execute()
}

/**
 * Returns all pending mail for a recipient device, then DELETES those rows
 * within the same transaction.
 *
 * Privacy model: the server is a relay, not a store. Messages are deleted
 * from the server the moment the recipient fetches them.
 */
export async function retrieveMail(
  db: Kysely<Database>,
  deviceID: string,
): Promise<MailTable[]> {
  return db.transaction().execute(async trx => {
    const rows = await trx
      .selectFrom('mail')
      .where('recipient', '=', deviceID)
      .selectAll()
      .execute()

    if (rows.length > 0) {
      await trx
        .deleteFrom('mail')
        .where('recipient', '=', deviceID)
        .execute()
    }

    return rows
  })
}

/**
 * Deletes a single mail row by nonce. No-op if the nonce does not exist.
 */
export async function deleteMail(
  db: Kysely<Database>,
  nonce: string,
): Promise<void> {
  await db.deleteFrom('mail').where('nonce', '=', nonce).execute()
}
