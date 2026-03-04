import type { Kysely } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema.alterTable('users').dropColumn('passwordSalt').execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .alterTable('users')
    .addColumn('passwordSalt', 'text', col => col.notNull().defaultTo('argon2id'))
    .execute()
}
