import type { Kysely } from 'kysely'
import type { Database, ServersTable, ChannelsTable } from '#db/types.js'

export async function createServer(
  _db: Kysely<Database>,
  _name: string,
  _icon: string,
): Promise<ServersTable> {
  throw new Error('not implemented')
}

export async function getServer(
  _db: Kysely<Database>,
  _serverID: string,
): Promise<ServersTable | null> {
  throw new Error('not implemented')
}

export async function getServers(
  _db: Kysely<Database>,
): Promise<ServersTable[]> {
  throw new Error('not implemented')
}

export async function deleteServer(
  _db: Kysely<Database>,
  _serverID: string,
): Promise<void> {
  throw new Error('not implemented')
}

export async function createChannel(
  _db: Kysely<Database>,
  _serverID: string,
  _name: string,
): Promise<ChannelsTable> {
  throw new Error('not implemented')
}

export async function getChannel(
  _db: Kysely<Database>,
  _channelID: string,
): Promise<ChannelsTable | null> {
  throw new Error('not implemented')
}

export async function getChannels(
  _db: Kysely<Database>,
  _serverID: string,
): Promise<ChannelsTable[]> {
  throw new Error('not implemented')
}

export async function deleteChannel(
  _db: Kysely<Database>,
  _channelID: string,
): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Returns all servers the user has a permission entry for
 * (resourceType = 'server').
 */
export async function getUserServers(
  _db: Kysely<Database>,
  _userID: string,
): Promise<ServersTable[]> {
  throw new Error('not implemented')
}
