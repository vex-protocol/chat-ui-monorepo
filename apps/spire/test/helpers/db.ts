import { onTestFinished } from 'vitest'
import SQLiteDatabase from 'better-sqlite3'
import { CompiledQuery, Kysely, SqliteDialect } from 'kysely'
import type { Database } from '#db/types.ts'
import { migrateToLatest } from '#db/migrate.ts'

/** Bare in-memory Kysely instance — no schema applied. */
export function createTestDb(): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new SQLiteDatabase(':memory:'),
      // SQLite only enforces FK constraints when this PRAGMA is set per-connection.
      // Without it, .references() in migrations generates valid DDL but inserts
      // referencing non-existent rows are silently accepted.
      onCreateConnection: async conn => {
        await conn.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = ON'))
      },
    }),
  })
}

/**
 * Migrated in-memory DB that auto-destroys after the current test.
 *
 * @example
 * it('does something', async () => {
 *   const db = await useDb()
 *   // fully migrated, destroyed automatically after this test
 * })
 */
export async function useDb(): Promise<Kysely<Database>> {
  const db = createTestDb()
  await migrateToLatest(db)
  onTestFinished(() => db.destroy())
  return db
}
