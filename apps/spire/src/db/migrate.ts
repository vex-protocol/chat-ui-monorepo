import { Migrator } from 'kysely'
import type { Kysely } from 'kysely'
import type { Database } from './types.ts'
import { migrationProvider } from './migrations/index.ts'

function createMigrator(db: Kysely<Database>): Migrator {
  return new Migrator({ db, provider: migrationProvider })
}

export async function migrateToLatest(db: Kysely<Database>): Promise<void> {
  const migrator = createMigrator(db)
  const { error } = await migrator.migrateToLatest()
  if (error) throw error
}

export async function migrateDown(db: Kysely<Database>): Promise<void> {
  const migrator = createMigrator(db)
  // Roll back all migrations one at a time until none remain
  while (true) {
    const { error, results } = await migrator.migrateDown()
    if (error) throw error
    if (!results?.length) break
  }
}
