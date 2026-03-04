import { describe, expect, it } from 'vitest'
import type { Kysely } from 'kysely'
import { sql } from 'kysely'
import { createTestDb, useDb } from '#test/helpers/db.js'
import type { Database } from '../types.js'
import { migrateDown, migrateToLatest } from '../migrate.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const KYSELY_INTERNAL_TABLES = new Set(['kysely_migration', 'kysely_migration_lock'])

const EXPECTED_TABLES = [
  'users',
  'devices',
  'preKeys',
  'oneTimeKeys',
  'mail',
  'servers',
  'channels',
  'permissions',
  'files',
  'emojis',
  'invites',
] as const

type TableName = (typeof EXPECTED_TABLES)[number]

interface SqliteMasterRow { name: string }
interface PragmaIndexRow { name: string; unique: number }

async function appTableNames(db: Kysely<Database>): Promise<string[]> {
  const result = await sql<SqliteMasterRow>`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    ORDER BY name
  `.execute(db)
  return result.rows.map(r => r.name).filter(n => !KYSELY_INTERNAL_TABLES.has(n))
}

async function columnNames(db: Kysely<Database>, table: TableName): Promise<string[]> {
  const tables = await db.introspection.getTables()
  const meta = tables.find(t => t.name === table)
  if (!meta) return []
  return meta.columns.map(c => c.name)
}

async function indexInfo(db: Kysely<Database>, table: TableName): Promise<PragmaIndexRow[]> {
  // sql.raw() is safe here: `table` is the TableName union literal, not user input.
  const result = await sql<PragmaIndexRow>`
    PRAGMA index_list(${sql.raw(`'${table}'`)})
  `.execute(db)
  return result.rows
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('DB migrations', () => {
  // -------------------------------------------------------------------------
  // migrateToLatest
  // -------------------------------------------------------------------------

  describe('migrateToLatest', () => {
    it('creates all 11 application tables', async () => {
      const db = await useDb()

      const names = await appTableNames(db)
      for (const table of EXPECTED_TABLES) {
        expect(names, `table "${table}" should exist`).toContain(table)
      }
      expect(names).toHaveLength(EXPECTED_TABLES.length)
    })

    it('users table has expected columns', async () => {
      const db = await useDb()
      const cols = await columnNames(db, 'users')
      expect(cols).toContain('userID')
      expect(cols).toContain('username')
      expect(cols).toContain('passwordHash')
      expect(cols).toContain('lastSeen')
    })

    it('devices table has expected columns', async () => {
      const db = await useDb()
      const cols = await columnNames(db, 'devices')
      expect(cols).toContain('deviceID')
      expect(cols).toContain('signKey')
      expect(cols).toContain('owner')
      expect(cols).toContain('name')
      expect(cols).toContain('lastLogin')
      expect(cols).toContain('deleted')
    })

    it('preKeys table has expected columns', async () => {
      const db = await useDb()
      const cols = await columnNames(db, 'preKeys')
      expect(cols).toContain('keyID')
      expect(cols).toContain('userID')
      expect(cols).toContain('deviceID')
      expect(cols).toContain('publicKey')
      expect(cols).toContain('signature')
      expect(cols).toContain('index')
    })

    it('oneTimeKeys table has expected columns', async () => {
      const db = await useDb()
      const cols = await columnNames(db, 'oneTimeKeys')
      expect(cols).toContain('keyID')
      expect(cols).toContain('userID')
      expect(cols).toContain('deviceID')
      expect(cols).toContain('publicKey')
      expect(cols).toContain('signature')
      expect(cols).toContain('index')
    })

    it('mail table has expected columns', async () => {
      const db = await useDb()
      const cols = await columnNames(db, 'mail')
      for (const col of ['nonce', 'recipient', 'mailID', 'sender', 'header', 'cipher', 'mailType', 'time', 'authorID', 'readerID']) {
        expect(cols, `mail.${col} should exist`).toContain(col)
      }
    })

    it('servers, channels, permissions, files, emojis, invites have expected columns', async () => {
      const db = await useDb()

      const servers = await columnNames(db, 'servers')
      expect(servers).toContain('serverID')
      expect(servers).toContain('name')
      expect(servers).toContain('icon')

      const channels = await columnNames(db, 'channels')
      expect(channels).toContain('channelID')
      expect(channels).toContain('serverID')
      expect(channels).toContain('name')

      const perms = await columnNames(db, 'permissions')
      expect(perms).toContain('permissionID')
      expect(perms).toContain('userID')
      expect(perms).toContain('resourceType')
      expect(perms).toContain('resourceID')
      expect(perms).toContain('powerLevel')

      const files = await columnNames(db, 'files')
      expect(files).toContain('fileID')
      expect(files).toContain('owner')
      expect(files).toContain('nonce')

      const emojis = await columnNames(db, 'emojis')
      expect(emojis).toContain('emojiID')
      expect(emojis).toContain('owner')
      expect(emojis).toContain('name')

      const invites = await columnNames(db, 'invites')
      expect(invites).toContain('inviteID')
      expect(invites).toContain('serverID')
      expect(invites).toContain('owner')
      expect(invites).toContain('expiration')
    })

    it('unique indexes exist on users.username and devices.signKey', async () => {
      const db = await useDb()

      const userIndexes = await indexInfo(db, 'users')
      const uniqueUserIndexes = userIndexes.filter(i => i.unique === 1)
      expect(uniqueUserIndexes.length, 'users should have at least one unique index (username)').toBeGreaterThanOrEqual(1)

      const deviceIndexes = await indexInfo(db, 'devices')
      const uniqueDeviceIndexes = deviceIndexes.filter(i => i.unique === 1)
      expect(uniqueDeviceIndexes.length, 'devices should have at least one unique index (signKey)').toBeGreaterThanOrEqual(1)
    })

    it('indexes exist on foreign/lookup key columns', async () => {
      const db = await useDb()

      const tablesExpectingIndexes: TableName[] = [
        'preKeys',
        'oneTimeKeys',
        'mail',
        'channels',
        'permissions',
        'files',
        'emojis',
        'invites',
      ]

      for (const table of tablesExpectingIndexes) {
        const indexes = await indexInfo(db, table)
        expect(indexes.length, `${table} should have at least one index`).toBeGreaterThan(0)
      }
    })

    it('enforces NOT NULL — inserting a null required column throws', async () => {
      const db = await useDb()
      await expect(
        // username is NOT NULL; omitting it via raw SQL triggers the constraint
        sql`INSERT INTO users (userID, passwordHash, lastSeen) VALUES ('u1', 'h', 't')`.execute(db),
      ).rejects.toThrow()
    })

    it('enforces UNIQUE — inserting duplicate username throws', async () => {
      const db = await useDb()
      await sql`INSERT INTO users (userID, username, passwordHash, lastSeen) VALUES ('u1', 'alice', 'h', 't')`.execute(db)
      await expect(
        sql`INSERT INTO users (userID, username, passwordHash, lastSeen) VALUES ('u2', 'alice', 'h', 't')`.execute(db),
      ).rejects.toThrow()
    })

    it('is idempotent — running migrateToLatest twice does not throw', async () => {
      const db = createTestDb()
      await migrateToLatest(db)
      await expect(migrateToLatest(db)).resolves.not.toThrow()
      await db.destroy()
    })
  })

  // -------------------------------------------------------------------------
  // migrateDown
  // -------------------------------------------------------------------------

  describe('migrateDown', () => {
    it('removes all application tables after rolling back', async () => {
      const db = createTestDb()
      await migrateToLatest(db)
      await migrateDown(db)

      const names = await appTableNames(db)
      expect(names).toHaveLength(0)
      await db.destroy()
    })
  })
})
