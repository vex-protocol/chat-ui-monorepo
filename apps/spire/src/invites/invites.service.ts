import { v4 as uuidv4 } from 'uuid'
import type { Kysely } from 'kysely'
import type { Database, InvitesTable } from '#db/types.ts'

export async function createInvite(
  db: Kysely<Database>,
  serverID: string,
  owner: string,
  expiration: string | null,
): Promise<InvitesTable> {
  const inviteID = uuidv4()
  await db.insertInto('invites').values({ inviteID, serverID, owner, expiration }).execute()
  return { inviteID, serverID, owner, expiration }
}

export async function getInvite(
  db: Kysely<Database>,
  inviteID: string,
): Promise<InvitesTable | null> {
  const row = await db
    .selectFrom('invites')
    .where('inviteID', '=', inviteID)
    .selectAll()
    .executeTakeFirst()
  return row ?? null
}

export async function getServerInvites(
  db: Kysely<Database>,
  serverID: string,
): Promise<InvitesTable[]> {
  return db.selectFrom('invites').where('serverID', '=', serverID).selectAll().execute()
}

export async function deleteInvite(
  db: Kysely<Database>,
  inviteID: string,
): Promise<void> {
  await db.deleteFrom('invites').where('inviteID', '=', inviteID).execute()
}

/**
 * Returns true if the invite exists and has not expired.
 * Invites with null expiration never expire.
 */
export async function isInviteValid(
  db: Kysely<Database>,
  inviteID: string,
): Promise<boolean> {
  const invite = await getInvite(db, inviteID)
  if (!invite) return false
  if (invite.expiration === null) return true
  return new Date(invite.expiration) > new Date()
}
