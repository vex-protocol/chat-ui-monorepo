import { v4 as uuidv4 } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database, PermissionsTable } from '#db/types.js'

export async function createPermission(
  db: Kysely<Database>,
  userID: string,
  resourceType: string,
  resourceID: string,
  powerLevel: number,
): Promise<PermissionsTable> {
  const permissionID = uuidv4()
  await db
    .insertInto('permissions')
    .values({ permissionID, userID, resourceType, resourceID, powerLevel })
    .execute()
  return { permissionID, userID, resourceType, resourceID, powerLevel }
}

export async function getPermissions(
  db: Kysely<Database>,
  userID: string,
): Promise<PermissionsTable[]> {
  return db.selectFrom('permissions').where('userID', '=', userID).selectAll().execute()
}

export async function getPermissionsByResource(
  db: Kysely<Database>,
  resourceID: string,
): Promise<PermissionsTable[]> {
  return db.selectFrom('permissions').where('resourceID', '=', resourceID).selectAll().execute()
}

export async function deletePermission(
  db: Kysely<Database>,
  permissionID: string,
): Promise<void> {
  await db.deleteFrom('permissions').where('permissionID', '=', permissionID).execute()
}

/**
 * Returns all permission rows for the server that owns the given channel.
 * Equivalent to "members of the group channel".
 */
export async function getGroupMembers(
  db: Kysely<Database>,
  channelID: string,
): Promise<PermissionsTable[]> {
  return db
    .selectFrom('channels')
    .innerJoin('permissions', 'permissions.resourceID', 'channels.serverID')
    .where('channels.channelID', '=', channelID)
    .where('permissions.resourceType', '=', 'server')
    .select([
      'permissions.permissionID',
      'permissions.userID',
      'permissions.resourceType',
      'permissions.resourceID',
      'permissions.powerLevel',
    ])
    .execute()
}

/**
 * Returns true if the user has a permission entry for the resource with
 * powerLevel >= minPowerLevel.
 */
export async function hasPermission(
  db: Kysely<Database>,
  userID: string,
  resourceID: string,
  minPowerLevel: number,
): Promise<boolean> {
  const row = await db
    .selectFrom('permissions')
    .where('userID', '=', userID)
    .where('resourceID', '=', resourceID)
    .where('powerLevel', '>=', minPowerLevel)
    .select('permissionID')
    .executeTakeFirst()
  return row !== undefined
}
