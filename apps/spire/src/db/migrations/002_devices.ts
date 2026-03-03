import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('devices')
    .addColumn('deviceID', 'text', col => col.primaryKey().notNull())
    .addColumn('signKey', 'text', col => col.unique().notNull())
    .addColumn('owner', 'text', col => col.notNull().references('users.userID'))
    .addColumn('name', 'text', col => col.notNull())
    .addColumn('lastLogin', 'text')
    .addColumn('deleted', 'integer', col => col.notNull().defaultTo(0))
    .execute()

  await db.schema
    .createIndex('idx_devices_owner')
    .on('devices')
    .column('owner')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('devices').execute()
}
