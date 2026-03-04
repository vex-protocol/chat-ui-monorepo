import type { Migration, MigrationProvider } from 'kysely'
import * as m001 from './001_users.ts'
import * as m002 from './002_devices.ts'
import * as m003 from './003_preKeys.ts'
import * as m004 from './004_oneTimeKeys.ts'
import * as m005 from './005_mail.ts'
import * as m006 from './006_servers.ts'
import * as m007 from './007_channels.ts'
import * as m008 from './008_permissions.ts'
import * as m009 from './009_files.ts'
import * as m010 from './010_emojis.ts'
import * as m011 from './011_invites.ts'
import * as m012 from './012_drop_password_salt.ts'

export const migrations: Record<string, Migration> = {
  '001_users': m001,
  '002_devices': m002,
  '003_preKeys': m003,
  '004_oneTimeKeys': m004,
  '005_mail': m005,
  '006_servers': m006,
  '007_channels': m007,
  '008_permissions': m008,
  '009_files': m009,
  '010_emojis': m010,
  '011_invites': m011,
  '012_drop_password_salt': m012,
}

export const migrationProvider: MigrationProvider = {
  getMigrations(): Promise<Record<string, Migration>> {
    return Promise.resolve(migrations)
  },
}
