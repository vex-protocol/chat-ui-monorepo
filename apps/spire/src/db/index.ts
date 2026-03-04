import SQLiteDatabase from 'better-sqlite3'
import { CompiledQuery, Kysely, SqliteDialect } from 'kysely'
import type { Config } from '#config'
import type { Database } from './types.ts'

export type { Database } from './types.ts'

/**
 * Creates a production Kysely instance from parsed config.
 * Only SQLite is supported until the pg dialect is added (vex-chat-b5e).
 */
export function createDb(config: Config): Kysely<Database> {
  if (config.DB_TYPE !== 'sqlite') {
    throw new Error(
      'Only SQLite is supported in this build. Install the pg package for PostgreSQL.',
    )
  }

  const path = config.SQLITE_PATH ?? ':memory:'
  return new Kysely<Database>({
    dialect: new SqliteDialect({
      database: new SQLiteDatabase(path),
      onCreateConnection: async conn => {
        await conn.executeQuery(CompiledQuery.raw('PRAGMA foreign_keys = ON'))
      },
    }),
  })
}
