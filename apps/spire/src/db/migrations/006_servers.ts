import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('servers')
    .addColumn('serverID', 'text', col => col.primaryKey().notNull())
    .addColumn('name', 'text', col => col.notNull())
    .addColumn('icon', 'text', col => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('servers').execute()
}
