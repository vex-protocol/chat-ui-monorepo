import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '#test/helpers/db.js'
import { seedUser } from '#test/helpers/factories.js'
import { createServer, createChannel } from '#servers/servers.service.js'
import {
  createPermission,
  getPermissions,
  getPermissionsByResource,
  deletePermission,
  getGroupMembers,
  hasPermission,
} from '../permissions.service.js'

// ---------------------------------------------------------------------------
// createPermission
// ---------------------------------------------------------------------------

describe('createPermission', () => {
  it('creates a permission and returns it with correct fields', async () => {
    const db = await useDb()
    const userID = await seedUser(db)
    const resourceID = uuidv4()

    const perm = await createPermission(db, userID, 'server', resourceID, 50)

    expect(perm.permissionID).toBeTypeOf('string')
    expect(perm.userID).toBe(userID)
    expect(perm.resourceType).toBe('server')
    expect(perm.resourceID).toBe(resourceID)
    expect(perm.powerLevel).toBe(50)
  })
})

// ---------------------------------------------------------------------------
// getPermissions
// ---------------------------------------------------------------------------

describe('getPermissions', () => {
  it('returns all permission rows for the user', async () => {
    const db = await useDb()
    const userID = await seedUser(db)
    const r1 = uuidv4()
    const r2 = uuidv4()
    await createPermission(db, userID, 'server', r1, 50)
    await createPermission(db, userID, 'channel', r2, 25)

    const perms = await getPermissions(db, userID)
    expect(perms).toHaveLength(2)
    expect(perms.map(p => p.resourceID)).toEqual(expect.arrayContaining([r1, r2]))
  })

  it('returns an empty array for a user with no permissions', async () => {
    const db = await useDb()
    expect(await getPermissions(db, uuidv4())).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getPermissionsByResource
// ---------------------------------------------------------------------------

describe('getPermissionsByResource', () => {
  it('returns all permissions for the resource', async () => {
    const db = await useDb()
    const userA = await seedUser(db)
    const userB = await seedUser(db)
    const resourceID = uuidv4()
    await createPermission(db, userA, 'server', resourceID, 50)
    await createPermission(db, userB, 'server', resourceID, 25)

    const perms = await getPermissionsByResource(db, resourceID)
    expect(perms).toHaveLength(2)
    expect(perms.map(p => p.userID)).toEqual(expect.arrayContaining([userA, userB]))
  })

  it('returns an empty array for an unknown resource', async () => {
    const db = await useDb()
    expect(await getPermissionsByResource(db, uuidv4())).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// deletePermission
// ---------------------------------------------------------------------------

describe('deletePermission', () => {
  it('removes the permission row', async () => {
    const db = await useDb()
    const userID = await seedUser(db)
    const resourceID = uuidv4()
    const perm = await createPermission(db, userID, 'server', resourceID, 50)

    await deletePermission(db, perm.permissionID)

    const remaining = await getPermissions(db, userID)
    expect(remaining).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// getGroupMembers
// ---------------------------------------------------------------------------

describe('getGroupMembers', () => {
  it('returns permission rows for users who have access to the channel\'s server', async () => {
    const db = await useDb()
    const userA = await seedUser(db)
    const userB = await seedUser(db)
    const server = await createServer(db, 'Test', 't.png')
    const channel = await createChannel(db, server.serverID, 'general')

    await createPermission(db, userA, 'server', server.serverID, 50)
    await createPermission(db, userB, 'server', server.serverID, 25)

    const members = await getGroupMembers(db, channel.channelID)
    expect(members).toHaveLength(2)
    expect(members.map(m => m.userID)).toEqual(expect.arrayContaining([userA, userB]))
  })

  it('returns an empty array when no one has server permission', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Empty', 'e.png')
    const channel = await createChannel(db, server.serverID, 'general')

    expect(await getGroupMembers(db, channel.channelID)).toEqual([])
  })

  it('does not return permissions for a different server', async () => {
    const db = await useDb()
    const userA = await seedUser(db)
    const s1 = await createServer(db, 'S1', 'i1.png')
    const s2 = await createServer(db, 'S2', 'i2.png')
    const channelS1 = await createChannel(db, s1.serverID, 'ch1')
    await createChannel(db, s2.serverID, 'ch2')

    // userA has permission only on s2, not s1
    await createPermission(db, userA, 'server', s2.serverID, 50)

    expect(await getGroupMembers(db, channelS1.channelID)).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

describe('hasPermission', () => {
  it('returns true when user has exactly the minimum power level', async () => {
    const db = await useDb()
    const userID = await seedUser(db)
    const resourceID = uuidv4()
    await createPermission(db, userID, 'server', resourceID, 50)

    expect(await hasPermission(db, userID, resourceID, 50)).toBe(true)
  })

  it('returns true when user power level exceeds the minimum', async () => {
    const db = await useDb()
    const userID = await seedUser(db)
    const resourceID = uuidv4()
    await createPermission(db, userID, 'server', resourceID, 75)

    expect(await hasPermission(db, userID, resourceID, 50)).toBe(true)
  })

  it('returns false when user power level is below the minimum', async () => {
    const db = await useDb()
    const userID = await seedUser(db)
    const resourceID = uuidv4()
    await createPermission(db, userID, 'server', resourceID, 25)

    expect(await hasPermission(db, userID, resourceID, 50)).toBe(false)
  })

  it('returns false when user has no permission entry for the resource', async () => {
    const db = await useDb()
    const userID = await seedUser(db)
    const resourceID = uuidv4()

    expect(await hasPermission(db, userID, resourceID, 50)).toBe(false)
  })
})
