import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('oneTimeKeys')
    .addColumn('keyID', 'text', col => col.primaryKey().notNull())
    .addColumn('userID', 'text', col => col.notNull())
    .addColumn('deviceID', 'text', col => col.notNull())
    .addColumn('publicKey', 'text', col => col.notNull())
    .addColumn('signature', 'text', col => col.notNull())
    .addColumn('index', 'integer', col => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_oneTimeKeys_userID')
    .on('oneTimeKeys')
    .column('userID')
    .execute()

  await db.schema
    .createIndex('idx_oneTimeKeys_deviceID')
    .on('oneTimeKeys')
    .column('deviceID')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('oneTimeKeys').execute()
}
