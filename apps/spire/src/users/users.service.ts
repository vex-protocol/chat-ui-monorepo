import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'

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
