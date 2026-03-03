import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('permissions')
    .addColumn('permissionID', 'text', col => col.primaryKey().notNull())
    .addColumn('userID', 'text', col => col.notNull())
    .addColumn('resourceType', 'text', col => col.notNull())
    .addColumn('resourceID', 'text', col => col.notNull())
    .addColumn('powerLevel', 'integer', col => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_permissions_userID')
    .on('permissions')
    .column('userID')
    .execute()

  await db.schema
    .createIndex('idx_permissions_resourceID')
    .on('permissions')
    .column('resourceID')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('permissions').execute()
}
