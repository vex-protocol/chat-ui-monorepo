import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '#test/helpers/db.ts'
import {
  createServer,
  getServer,
  getServers,
  deleteServer,
  createChannel,
  getChannel,
  getChannels,
  deleteChannel,
  getUserServers,
} from '../servers.service.ts'

// ---------------------------------------------------------------------------
// createServer / getServer / getServers / deleteServer
// ---------------------------------------------------------------------------

describe('createServer', () => {
  it('creates a server and returns it with correct fields', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Test Server', 'icon.png')

    expect(server.serverID).toBeTypeOf('string')
    expect(server.name).toBe('Test Server')
    expect(server.icon).toBe('icon.png')
  })
})

describe('getServer', () => {
  it('returns the server for a valid serverID', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Alpha', 'a.png')

    const found = await getServer(db, server.serverID)
    expect(found).not.toBeNull()
    expect(found?.serverID).toBe(server.serverID)
    expect(found?.name).toBe('Alpha')
  })

  it('returns null for an unknown serverID', async () => {
    const db = await useDb()
    expect(await getServer(db, uuidv4())).toBeNull()
  })
})

describe('getServers', () => {
  it('returns all servers', async () => {
    const db = await useDb()
    await createServer(db, 'S1', 'i1.png')
    await createServer(db, 'S2', 'i2.png')

    const servers = await getServers(db)
    expect(servers).toHaveLength(2)
    expect(servers.map(s => s.name)).toEqual(expect.arrayContaining(['S1', 'S2']))
  })

  it('returns an empty array when no servers exist', async () => {
    const db = await useDb()
    expect(await getServers(db)).toEqual([])
  })
})

describe('deleteServer', () => {
  it('removes the server row', async () => {
    const db = await useDb()
    const server = await createServer(db, 'ToDelete', 'x.png')

    await deleteServer(db, server.serverID)

    expect(await getServer(db, server.serverID)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createChannel / getChannel / getChannels / deleteChannel
// ---------------------------------------------------------------------------

describe('createChannel', () => {
  it('creates a channel linked to the server', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Main', 'm.png')
    const channel = await createChannel(db, server.serverID, 'general')

    expect(channel.channelID).toBeTypeOf('string')
    expect(channel.serverID).toBe(server.serverID)
    expect(channel.name).toBe('general')
  })
})

describe('getChannel', () => {
  it('returns the channel for a valid channelID', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Main', 'm.png')
    const channel = await createChannel(db, server.serverID, 'general')

    const found = await getChannel(db, channel.channelID)
    expect(found?.channelID).toBe(channel.channelID)
    expect(found?.name).toBe('general')
  })

  it('returns null for an unknown channelID', async () => {
    const db = await useDb()
    expect(await getChannel(db, uuidv4())).toBeNull()
  })
})

describe('getChannels', () => {
  it('returns all channels for the given server', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Main', 'm.png')
    await createChannel(db, server.serverID, 'general')
    await createChannel(db, server.serverID, 'off-topic')

    const channels = await getChannels(db, server.serverID)
    expect(channels).toHaveLength(2)
    expect(channels.map(c => c.name)).toEqual(expect.arrayContaining(['general', 'off-topic']))
  })

  it('does not return channels from other servers', async () => {
    const db = await useDb()
    const s1 = await createServer(db, 'S1', 'i1.png')
    const s2 = await createServer(db, 'S2', 'i2.png')
    await createChannel(db, s1.serverID, 'alpha')
    await createChannel(db, s2.serverID, 'beta')

    expect(await getChannels(db, s1.serverID)).toHaveLength(1)
  })

  it('returns an empty array when the server has no channels', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Empty', 'e.png')
    expect(await getChannels(db, server.serverID)).toEqual([])
  })
})

describe('deleteChannel', () => {
  it('removes the channel row', async () => {
    const db = await useDb()
    const server = await createServer(db, 'Main', 'm.png')
    const channel = await createChannel(db, server.serverID, 'temp')

    await deleteChannel(db, channel.channelID)

    expect(await getChannel(db, channel.channelID)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// getUserServers
// ---------------------------------------------------------------------------

describe('getUserServers', () => {
  it('returns servers the user has a permission entry for', async () => {
    const db = await useDb()
    const userID = uuidv4()
    const server = await createServer(db, 'Member Server', 's.png')

    // Insert a permission entry linking the user to the server
    await db
      .insertInto('permissions')
      .values({
        permissionID: uuidv4(),
        userID,
        resourceType: 'server',
        resourceID: server.serverID,
        powerLevel: 50,
      })
      .execute()

    const userServers = await getUserServers(db, userID)
    expect(userServers).toHaveLength(1)
    expect(userServers[0]!.serverID).toBe(server.serverID)
  })

  it('returns an empty array when the user has no server permissions', async () => {
    const db = await useDb()
    await createServer(db, 'Unrelated', 'u.png')

    expect(await getUserServers(db, uuidv4())).toEqual([])
  })

  it('does not return servers the user has no permission for', async () => {
    const db = await useDb()
    const userA = uuidv4()
    const userB = uuidv4()
    const server = await createServer(db, 'Private', 'p.png')

    await db
      .insertInto('permissions')
      .values({
        permissionID: uuidv4(),
        userID: userA,
        resourceType: 'server',
        resourceID: server.serverID,
        powerLevel: 50,
      })
      .execute()

    expect(await getUserServers(db, userB)).toEqual([])
  })
})
