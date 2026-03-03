import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('preKeys')
    .addColumn('keyID', 'text', col => col.primaryKey().notNull())
    .addColumn('userID', 'text', col => col.notNull())
    .addColumn('deviceID', 'text', col => col.unique().notNull())
    .addColumn('publicKey', 'text', col => col.notNull())
    .addColumn('signature', 'text', col => col.notNull())
    .addColumn('index', 'integer', col => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_preKeys_userID')
    .on('preKeys')
    .column('userID')
    .execute()

  await db.schema
    .createIndex('idx_preKeys_deviceID')
    .on('preKeys')
    .column('deviceID')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('preKeys').execute()
}
