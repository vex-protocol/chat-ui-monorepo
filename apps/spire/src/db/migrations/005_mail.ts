import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('mail')
    .addColumn('nonce', 'text', col => col.primaryKey().notNull())
    .addColumn('recipient', 'text', col => col.notNull())
    .addColumn('mailID', 'text', col => col.notNull())
    .addColumn('sender', 'text', col => col.notNull())
    .addColumn('header', 'text', col => col.notNull())
    .addColumn('cipher', 'text', col => col.notNull())
    .addColumn('group', 'text')
    .addColumn('extra', 'text')
    .addColumn('mailType', 'text', col => col.notNull())
    .addColumn('time', 'text', col => col.notNull())
    .addColumn('forward', 'text')
    .addColumn('authorID', 'text', col => col.notNull())
    .addColumn('readerID', 'text', col => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_mail_recipient')
    .on('mail')
    .column('recipient')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('mail').execute()
}
