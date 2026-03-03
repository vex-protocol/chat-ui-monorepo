import { onTestFinished } from 'vitest'
import SQLiteDatabase from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import type { Database } from '../../src/db/types.js'
import { migrateToLatest } from '../../src/db/migrate.js'

/** Bare in-memory Kysely instance — no schema applied. */
export function createTestDb(): Kysely<Database> {
  return new Kysely<Database>({
    dialect: new SqliteDialect({ database: new SQLiteDatabase(':memory:') }),
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
