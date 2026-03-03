import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('emojis')
    .addColumn('emojiID', 'text', col => col.primaryKey().notNull())
    .addColumn('owner', 'text', col => col.notNull())
    .addColumn('name', 'text', col => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_emojis_owner')
    .on('emojis')
    .column('owner')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('emojis').execute()
}
