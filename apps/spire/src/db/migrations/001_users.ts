import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('userID', 'text', col => col.primaryKey().notNull())
    .addColumn('username', 'text', col => col.unique().notNull())
    .addColumn('passwordHash', 'text', col => col.notNull())
    .addColumn('passwordSalt', 'text', col => col.notNull())
    .addColumn('lastSeen', 'text', col => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('users').execute()
}
