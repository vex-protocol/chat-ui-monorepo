import { v4 as uuidv4 } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database, ServersTable, ChannelsTable } from '#db/types.js'

export async function createServer(
  db: Kysely<Database>,
  name: string,
  icon: string,
): Promise<ServersTable> {
  const serverID = uuidv4()
  await db.insertInto('servers').values({ serverID, name, icon }).execute()
  return { serverID, name, icon }
}

export async function getServer(
  db: Kysely<Database>,
  serverID: string,
): Promise<ServersTable | null> {
  const row = await db
    .selectFrom('servers')
    .where('serverID', '=', serverID)
    .selectAll()
    .executeTakeFirst()
  return row ?? null
}

export async function getServers(db: Kysely<Database>): Promise<ServersTable[]> {
  return db.selectFrom('servers').selectAll().execute()
}

export async function deleteServer(
  db: Kysely<Database>,
  serverID: string,
): Promise<void> {
  await db.deleteFrom('servers').where('serverID', '=', serverID).execute()
}

export async function createChannel(
  db: Kysely<Database>,
  serverID: string,
  name: string,
): Promise<ChannelsTable> {
  const channelID = uuidv4()
  await db.insertInto('channels').values({ channelID, serverID, name }).execute()
  return { channelID, serverID, name }
}

export async function getChannel(
  db: Kysely<Database>,
  channelID: string,
): Promise<ChannelsTable | null> {
  const row = await db
    .selectFrom('channels')
    .where('channelID', '=', channelID)
    .selectAll()
    .executeTakeFirst()
  return row ?? null
}

export async function getChannels(
  db: Kysely<Database>,
  serverID: string,
): Promise<ChannelsTable[]> {
  return db
    .selectFrom('channels')
    .where('serverID', '=', serverID)
    .selectAll()
    .execute()
}

export async function deleteChannel(
  db: Kysely<Database>,
  channelID: string,
): Promise<void> {
  await db.deleteFrom('channels').where('channelID', '=', channelID).execute()
}

/**
 * Returns all servers the user has a permission entry for
 * (resourceType = 'server').
 */
export async function getUserServers(
  db: Kysely<Database>,
  userID: string,
): Promise<ServersTable[]> {
  return db
    .selectFrom('permissions')
    .innerJoin('servers', 'servers.serverID', 'permissions.resourceID')
    .where('permissions.userID', '=', userID)
    .where('permissions.resourceType', '=', 'server')
    .select(['servers.serverID', 'servers.name', 'servers.icon'])
    .execute()
}
