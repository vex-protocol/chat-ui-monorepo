import type { Kysely } from 'kysely'
import type { Database, InvitesTable } from '#db/types.js'

export async function createInvite(
  db: Kysely<Database>,
  serverID: string,
  owner: string,
  expiration: string | null,
): Promise<InvitesTable> {
  throw new Error('not implemented')
}

export async function getInvite(
  db: Kysely<Database>,
  inviteID: string,
): Promise<InvitesTable | null> {
  throw new Error('not implemented')
}

export async function getServerInvites(
  db: Kysely<Database>,
  serverID: string,
): Promise<InvitesTable[]> {
  throw new Error('not implemented')
}

export async function deleteInvite(
  db: Kysely<Database>,
  inviteID: string,
): Promise<void> {
  throw new Error('not implemented')
}

/**
 * Returns true if the invite exists and has not expired.
 * Invites with null expiration never expire.
 */
export async function isInviteValid(
  db: Kysely<Database>,
  inviteID: string,
): Promise<boolean> {
  throw new Error('not implemented')
}
