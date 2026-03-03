export type { Database } from './types.js'

// Production database factory — implemented in vex-chat-b5e alongside config module.
// Will read DB_TYPE from parsed config and return a Kysely<Database> instance
// backed by either SQLite (better-sqlite3) or PostgreSQL (pg).
