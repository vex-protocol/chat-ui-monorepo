import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '#test/helpers/db.ts'
import { createServer } from '#servers/servers.service.ts'
import {
  createInvite,
  getInvite,
  getServerInvites,
  deleteInvite,
  isInviteValid,
} from '../invites.service.ts'

// ---------------------------------------------------------------------------
// createInvite
// ---------------------------------------------------------------------------

describe('createInvite', () => {
  it('creates an invite with null expiration and returns correct fields', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test', 't.png')
    const ownerID = uuidv4()

    const invite = await createInvite(db, server.serverID, ownerID, null)

    expect(invite.inviteID).toBeTypeOf('string')
    expect(invite.serverID).toBe(server.serverID)
    expect(invite.owner).toBe(ownerID)
    expect(invite.expiration).toBeNull()
  })

  it('creates an invite with a future expiration', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test', 't.png')
    const ownerID = uuidv4()
    const expiration = new Date(Date.now() + 86_400_000).toISOString() // +1 day

    const invite = await createInvite(db, server.serverID, ownerID, expiration)

    expect(invite.expiration).toBe(expiration)
  })
})

// ---------------------------------------------------------------------------
// getInvite
// ---------------------------------------------------------------------------

describe('getInvite', () => {
  it('returns the invite for a valid inviteID', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test', 't.png')
    const invite = await createInvite(db, server.serverID, uuidv4(), null)

    const found = await getInvite(db, invite.inviteID)
    expect(found).not.toBeNull()
    expect(found?.inviteID).toBe(invite.inviteID)
    expect(found?.serverID).toBe(server.serverID)
  })

  it('returns null for an unknown inviteID', async () => {
    const db = await useDb()
    expect(await getInvite(db, uuidv4())).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getServerInvites
// ---------------------------------------------------------------------------

describe('getServerInvites', () => {
  it('returns all invites for the server', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test', 't.png')
    await createInvite(db, server.serverID, uuidv4(), null)
    await createInvite(db, server.serverID, uuidv4(), null)

    const invites = await getServerInvites(db, server.serverID)
    expect(invites).toHaveLength(2)
  })

  it('returns an empty array for a server with no invites', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Empty', 'e.png')
    expect(await getServerInvites(db, server.serverID)).toEqual([])
  })

  it('does not return invites for other servers', async () => {
    const db = await useDb()
    const s1 = await createServer(db, 'S1', 'i1.png')
    const s2 = await createServer(db, 'S2', 'i2.png')
    await createInvite(db, s1.serverID, uuidv4(), null)

    expect(await getServerInvites(db, s2.serverID)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// deleteInvite
// ---------------------------------------------------------------------------

describe('deleteInvite', () => {
  it('removes the invite row', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test', 't.png')
    const invite = await createInvite(db, server.serverID, uuidv4(), null)

    await deleteInvite(db, invite.inviteID)

    expect(await getInvite(db, invite.inviteID)).toBeNull()
  })

  it('is a no-op for an unknown inviteID', async () => {
    const db = await useDb()
    await expect(deleteInvite(db, uuidv4())).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// isInviteValid
// ---------------------------------------------------------------------------

describe('isInviteValid', () => {
  it('returns true when expiration is null (never expires)', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test', 't.png')
    const invite = await createInvite(db, server.serverID, uuidv4(), null)

    expect(await isInviteValid(db, invite.inviteID)).toBe(true)
  })

  it('returns true when expiration is in the future', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test', 't.png')
    const expiration = new Date(Date.now() + 86_400_000).toISOString()
    const invite = await createInvite(db, server.serverID, uuidv4(), expiration)

    expect(await isInviteValid(db, invite.inviteID)).toBe(true)
  })

  it('returns false when expiration is in the past', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test', 't.png')
    const expiration = new Date(Date.now() - 1000).toISOString() // 1 second ago
    const invite = await createInvite(db, server.serverID, uuidv4(), expiration)

    expect(await isInviteValid(db, invite.inviteID)).toBe(false)
  })

  it('returns false when inviteID does not exist', async () => {
    const db = await useDb()
    expect(await isInviteValid(db, uuidv4())).toBe(false)
  })
})
