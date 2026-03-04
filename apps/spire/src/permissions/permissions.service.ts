import type { Kysely } from 'kysely'
import type { Database, PermissionsTable } from '#db/types.js'

export async function createPermission(
  db: Kysely<Database>,
  userID: string,
  resourceType: string,
  resourceID: string,
  powerLevel: number,
): Promise<PermissionsTable> {
  throw new Error('not implemented')
}

export async function getPermissions(
  db: Kysely<Database>,
  userID: string,
): Promise<PermissionsTable[]> {
  throw new Error('not implemented')
}

export async function getPermissionsByResource(
  db: Kysely<Database>,
  resourceID: string,
): Promise<PermissionsTable[]> {
  throw new Error('not implemented')
}

export async function deletePermission(
  db: Kysely<Database>,
  permissionID: string,
): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Returns all permission rows for the server that owns the given channel.
 * Equivalent to "members of the group channel".
 */
export async function getGroupMembers(
  db: Kysely<Database>,
  channelID: string,
): Promise<PermissionsTable[]> {
  throw new Error('not implemented')
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
  throw new Error('not implemented')
}
