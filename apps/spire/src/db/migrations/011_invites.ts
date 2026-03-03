import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('invites')
    .addColumn('inviteID', 'text', col => col.primaryKey().notNull())
    .addColumn('serverID', 'text', col => col.notNull().references('servers.serverID'))
    .addColumn('owner', 'text', col => col.notNull())
    .addColumn('expiration', 'text')
    .execute()

  await db.schema
    .createIndex('idx_invites_serverID')
    .on('invites')
    .column('serverID')
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('invites').execute()
}
