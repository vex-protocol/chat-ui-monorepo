import type { Kysely } from 'kysely'
import type { Database, ServersTable } from '#db/types.ts'

export interface PublicUser {
  userID: string
  username: string
  lastSeen: string
}

/**
 * Returns the public profile for a user, or null if not found.
 */
export async function getUser(
  db: Kysely<Database>,
  userID: string,
): Promise<PublicUser | null> {
  const row = await db
    .selectFrom('users')
    .where('userID', '=', userID)
    .select(['userID', 'username', 'lastSeen'])
    .executeTakeFirst()

  return row ?? null
}

/**
 * Returns all servers that the user is a member of (has a permission entry for).
 */
export async function getServersForUser(
  db: Kysely<Database>,
  userID: string,
): Promise<Pick<ServersTable, 'serverID' | 'name' | 'icon'>[]> {
  return db
    .selectFrom('permissions')
    .innerJoin('servers', 'servers.serverID', 'permissions.resourceID')
    .where('permissions.userID', '=', userID)
    .where('permissions.resourceType', '=', 'server')
    .select(['servers.serverID', 'servers.name', 'servers.icon'])
    .execute()
}

/**
 * Searches users by username prefix/substring. Returns at most 10 results.
 * Case-insensitive via SQLite LIKE.
 */
export async function searchUsers(
  db: Kysely<Database>,
  query: string,
): Promise<PublicUser[]> {
  return db
    .selectFrom('users')
    .where('username', 'like', `%${query}%`)
    .select(['userID', 'username', 'lastSeen'])
    .limit(10)
    .execute()
}
