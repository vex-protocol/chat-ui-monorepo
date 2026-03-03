import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('channels')
    .addColumn('channelID', 'text', col => col.primaryKey().notNull())
    .addColumn('serverID', 'text', col => col.notNull().references('servers.serverID'))
    .addColumn('name', 'text', col => col.notNull())
    .execute()

  await db.schema
    .createIndex('idx_channels_serverID')
    .on('channels')
    .column('serverID')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('channels').execute()
}
