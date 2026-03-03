import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('files')
    .addColumn('fileID', 'text', col => col.primaryKey().notNull())
    .addColumn('owner', 'text', col => col.notNull())
    .addColumn('nonce', 'text', col => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_files_owner')
    .on('files')
    .column('owner')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('files').execute()
}
