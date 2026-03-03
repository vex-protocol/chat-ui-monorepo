import type { Migration, MigrationProvider } from 'kysely'

/**
 * All migrations in chronological order.
 * Populated by vex-chat-b5e (Implement DB schema).
 */
export const migrations: Record<string, Migration> = {
  // 001_users, 002_devices, ... to be added in vex-chat-b5e
}

export const migrationProvider: MigrationProvider = {
  getMigrations(): Promise<Record<string, Migration>> {
    return Promise.resolve(migrations)
  },
}
