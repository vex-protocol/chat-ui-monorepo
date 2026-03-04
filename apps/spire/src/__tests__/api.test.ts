/**
 * HTTP API integration tests.
 *
 * Uses supertest against a real Express app wired to an in-memory SQLite
 * Kysely instance. All service implementations must be in place for these
 * tests to pass — this suite drives the implementation of vex-chat-ekb.
 *
 * Auth cookie convention: the server sets `token=<jwt>; HttpOnly; Path=/`.
 * supertest.agent() persists cookies automatically between requests.
 */
import supertest from 'supertest'
import nacl from 'tweetnacl'
import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '#test/helpers/db.js'
import { makeRegistrationPayload, makeDevicePayload } from '#test/helpers/factories.js'
import { createTokenStore } from '#auth/auth.service.js'
import { createApp } from '../app.js'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.js'
import type { ITokenStore } from '#auth/auth.service.js'

// ---------------------------------------------------------------------------
// Shared setup helpers
// ---------------------------------------------------------------------------

type TestEnv = {
  db: Kysely<Database>
  tokenStore: ITokenStore
  agent: ReturnType<typeof supertest.agent>
}

async function makeEnv(): Promise<TestEnv> {
  const db = await useDb()
  const tokenStore = createTokenStore()
  const app = createApp(db, tokenStore)
  const agent = supertest.agent(app)
  return { db, tokenStore, agent }
}

/**
 * Registers a fresh user, returning the authed agent and identifying data.
 * The agent cookie is set after POST /register.
 */
async function registerUser(env: TestEnv, overrides?: { username?: string }) {
  const kp = nacl.sign.keyPair()
  const token = env.tokenStore.create('register')
  const { payload } = makeRegistrationPayload(token, kp, overrides)

  const res = await env.agent.post('/register').send(payload).expect(200)
  return { ...res.body as { userID: string; username: string; lastSeen: string }, kp, payload }
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

describe('POST /register', () => {
  it('creates a user and returns user data with auth cookie set', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    expect(user.userID).toBeTypeOf('string')
    expect(user.username).toBe('alice')
    // Cookie header present
    const whoami = await env.agent.post('/whoami').expect(200)
    expect(whoami.body.userID).toBe(user.userID)
  })

  it('returns 409 on duplicate username', async () => {
    const env = await makeEnv()
    await registerUser(env, { username: 'alice' })

    const kp2 = nacl.sign.keyPair()
    const token2 = env.tokenStore.create('register')
    const { payload: payload2 } = makeRegistrationPayload(token2, kp2, { username: 'alice' })
    await env.agent.post('/register').send(payload2).expect(409)
  })
})

describe('POST /auth', () => {
  it('returns 200 and sets auth cookie on valid credentials', async () => {
    const env = await makeEnv()
    await registerUser(env, { username: 'bob' })

    // Use a fresh agent on the same DB (simulates a different client session)
    const loginAgent = supertest.agent(createApp(env.db, env.tokenStore))
    const res = await loginAgent
      .post('/auth')
      .send({ username: 'bob', password: 'password123' })
      .expect(200)
    expect(res.body.username).toBe('bob')
  })

  it('returns 401 on invalid password', async () => {
    const env = await makeEnv()
    await registerUser(env, { username: 'charlie' })

    await env.agent
      .post('/auth')
      .send({ username: 'charlie', password: 'wrongpassword' })
      .expect(401)
  })

  it('returns 401 for unknown username', async () => {
    const env = await makeEnv()
    await env.agent
      .post('/auth')
      .send({ username: 'nobody', password: 'password123' })
      .expect(401)
  })
})

describe('POST /whoami', () => {
  it('returns the authenticated user', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const res = await env.agent.post('/whoami').expect(200)
    expect(res.body.userID).toBe(user.userID)
    expect(res.body.passwordHash).toBeUndefined()
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(createApp(env.db, env.tokenStore)).post('/whoami').expect(401)
  })
})

describe('POST /goodbye', () => {
  it('clears the auth cookie and subsequent whoami returns 401', async () => {
    const env = await makeEnv()
    await registerUser(env)

    await env.agent.post('/goodbye').expect(200)
    await env.agent.post('/whoami').expect(401)
  })
})

// ---------------------------------------------------------------------------
// Token routes
// ---------------------------------------------------------------------------

describe('GET /token/:type', () => {
  it('returns a token key for a valid type when authenticated', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const res = await env.agent.get('/token/file').expect(200)
    expect(res.body.key).toBeTypeOf('string')
    expect(res.body.scope).toBe('file')
  })

  it('returns 400 for an invalid token type', async () => {
    const env = await makeEnv()
    await registerUser(env)
    await env.agent.get('/token/invalid-type').expect(400)
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(createApp(env.db, env.tokenStore)).get('/token/file').expect(401)
  })
})

// ---------------------------------------------------------------------------
// User routes
// ---------------------------------------------------------------------------

describe('GET /user/:id', () => {
  it('returns a censored user (no passwordHash)', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const res = await env.agent.get(`/user/${user.userID}`).expect(200)
    expect(res.body.userID).toBe(user.userID)
    expect(res.body.username).toBe('alice')
    expect(res.body.passwordHash).toBeUndefined()
  })

  it('returns 404 for unknown userID', async () => {
    const env = await makeEnv()
    await registerUser(env)
    await env.agent.get(`/user/${uuidv4()}`).expect(404)
  })
})

describe('GET /user/:id/devices', () => {
  it('returns the device list for a user', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const res = await env.agent.get(`/user/${user.userID}/devices`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body[0].owner).toBe(user.userID)
  })
})

// ---------------------------------------------------------------------------
// Device routes
// ---------------------------------------------------------------------------

describe('POST /user/:id/devices', () => {
  it('registers a new device for the user', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const devicePayload = makeDevicePayload()
    const res = await env.agent
      .post(`/user/${user.userID}/devices`)
      .send(devicePayload)
      .expect(200)

    expect(res.body.deviceID).toBeTypeOf('string')
    expect(res.body.owner).toBe(user.userID)
  })
})

describe('GET /device/:id/otk/count', () => {
  it('returns the OTK count for a device', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    // Get first device from the list
    const devicesRes = await env.agent.get(`/user/${user.userID}/devices`).expect(200)
    const deviceID = devicesRes.body[0].deviceID

    const res = await env.agent.get(`/device/${deviceID}/otk/count`).expect(200)
    expect(res.body.count).toBeTypeOf('number')
  })
})

describe('POST /device/:id/otk', () => {
  it('saves one-time keys for the device', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const devicesRes = await env.agent.get(`/user/${user.userID}/devices`).expect(200)
    const deviceID = devicesRes.body[0].deviceID

    // Generate 5 OTKs signed with the registration signing key
    const otks = Array.from({ length: 5 }, (_, i) => {
      const otkPair = nacl.sign.keyPair()
      const sig = nacl.sign(otkPair.publicKey, user.kp.secretKey)
      return {
        publicKey: Buffer.from(otkPair.publicKey).toString('hex'),
        signature: Buffer.from(sig).toString('hex'),
        index: i,
      }
    })

    await env.agent.post(`/device/${deviceID}/otk`).send(otks).expect(200)

    const countRes = await env.agent.get(`/device/${deviceID}/otk/count`).expect(200)
    expect(countRes.body.count).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Server routes
// ---------------------------------------------------------------------------

describe('POST /server', () => {
  it('creates a server when authenticated', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const res = await env.agent
      .post('/server')
      .send({ name: 'My Server', icon: 'icon.png' })
      .expect(200)

    expect(res.body.serverID).toBeTypeOf('string')
    expect(res.body.name).toBe('My Server')
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(createApp(env.db, env.tokenStore))
      .post('/server')
      .send({ name: 'My Server', icon: 'icon.png' })
      .expect(401)
  })
})

describe('GET /server/:id', () => {
  it('returns the server', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const createRes = await env.agent
      .post('/server')
      .send({ name: 'TestServer', icon: 'i.png' })
      .expect(200)

    const res = await env.agent.get(`/server/${createRes.body.serverID}`).expect(200)
    expect(res.body.name).toBe('TestServer')
  })

  it('returns 404 for unknown serverID', async () => {
    const env = await makeEnv()
    await registerUser(env)
    await env.agent.get(`/server/${uuidv4()}`).expect(404)
  })
})

describe('DELETE /server/:id', () => {
  it('deletes the server when user has sufficient power level', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const createRes = await env.agent
      .post('/server')
      .send({ name: 'ToDelete', icon: 'd.png' })
      .expect(200)
    const serverID = createRes.body.serverID

    await env.agent.delete(`/server/${serverID}`).expect(200)
    await env.agent.get(`/server/${serverID}`).expect(404)
  })
})

// ---------------------------------------------------------------------------
// Channel routes
// ---------------------------------------------------------------------------

describe('POST /server/:id/channels', () => {
  it('creates a channel in the server', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent
      .post('/server')
      .send({ name: 'ChanServer', icon: 'c.png' })
      .expect(200)
    const serverID = serverRes.body.serverID

    const res = await env.agent
      .post(`/server/${serverID}/channels`)
      .send({ name: 'general' })
      .expect(200)

    expect(res.body.channelID).toBeTypeOf('string')
    expect(res.body.name).toBe('general')
    expect(res.body.serverID).toBe(serverID)
  })
})

describe('GET /server/:id/channels', () => {
  it('lists all channels for the server', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent
      .post('/server')
      .send({ name: 'ChanServer', icon: 'c.png' })
      .expect(200)
    const serverID = serverRes.body.serverID

    await env.agent.post(`/server/${serverID}/channels`).send({ name: 'general' }).expect(200)
    await env.agent.post(`/server/${serverID}/channels`).send({ name: 'off-topic' }).expect(200)

    const res = await env.agent.get(`/server/${serverID}/channels`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Permission routes
// ---------------------------------------------------------------------------

describe('GET /server/:serverID/permissions', () => {
  it('lists all permissions for the server when authenticated', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const serverRes = await env.agent
      .post('/server')
      .send({ name: 'PermServer', icon: 'p.png' })
      .expect(200)
    const serverID = serverRes.body.serverID

    const res = await env.agent.get(`/server/${serverID}/permissions`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    // Creator should have a permission entry
    const ownerPerm = res.body.find((p: { userID: string }) => p.userID === user.userID)
    expect(ownerPerm).toBeDefined()
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(createApp(env.db, env.tokenStore))
      .get(`/server/${uuidv4()}/permissions`)
      .expect(401)
  })
})

// ---------------------------------------------------------------------------
// Invite routes
// ---------------------------------------------------------------------------

describe('POST /server/:serverID/invites', () => {
  it('creates an invite for the server', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent
      .post('/server')
      .send({ name: 'InvServer', icon: 'i.png' })
      .expect(200)
    const serverID = serverRes.body.serverID

    const res = await env.agent
      .post(`/server/${serverID}/invites`)
      .send({ expiration: null })
      .expect(200)

    expect(res.body.inviteID).toBeTypeOf('string')
    expect(res.body.serverID).toBe(serverID)
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(createApp(env.db, env.tokenStore))
      .post(`/server/${uuidv4()}/invites`)
      .send({ expiration: null })
      .expect(401)
  })
})

describe('GET /server/:serverID/invites', () => {
  it('lists all invites for the server', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent
      .post('/server')
      .send({ name: 'InvServer', icon: 'i.png' })
      .expect(200)
    const serverID = serverRes.body.serverID

    await env.agent
      .post(`/server/${serverID}/invites`)
      .send({ expiration: null })
      .expect(200)

    const res = await env.agent.get(`/server/${serverID}/invites`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(1)
  })
})
