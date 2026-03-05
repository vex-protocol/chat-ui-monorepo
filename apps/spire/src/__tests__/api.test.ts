/**
 * HTTP API integration tests.
 *
 * Uses supertest against a real Express app wired to an in-memory SQLite
 * Kysely instance. Auth is via `Authorization: Bearer <jwt>` header — the
 * JWT is returned in the response body from POST /register and POST /auth
 * (in addition to being set as an httpOnly cookie for browser clients).
 *
 * We use a closure-based agent wrapper rather than supertest.agent() because
 * tough-cookie (used by superagent) does not reliably persist cookies for
 * IP addresses (127.0.0.1) in test environments.
 */
import supertest from 'supertest'
import { generateSignKeyPair, signMessage } from '@vex-chat/crypto'
import express from 'express'
import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '#test/helpers/db.ts'
import { makeRegistrationPayload, makeDevicePayload } from '#test/helpers/factories.ts'
import { createTokenStore } from '#auth/auth.token-store.ts'
import { createApp } from '../app.ts'
import type { Kysely } from 'kysely'
import type { Database } from '#db/types.ts'
import type { ITokenStore } from '#auth/auth.token-store.ts'

// ---------------------------------------------------------------------------
// Test environment and helpers
// ---------------------------------------------------------------------------

type Agent = {
  post(path: string): supertest.Test
  get(path: string): supertest.Test
  delete(path: string): supertest.Test
}

type TestEnv = {
  db: Kysely<Database>
  tokenStore: ITokenStore
  app: express.Application
  authToken: string | undefined
  agent: Agent
}

async function makeEnv(): Promise<TestEnv> {
  const db = await useDb()
  const tokenStore = createTokenStore()
  const app = createApp(db, tokenStore, process.env['JWT_SECRET']!)

  const env: TestEnv = {
    db,
    tokenStore,
    app,
    authToken: undefined,
    agent: null as unknown as Agent, // set below
  }

  // Closure-based agent: automatically adds Authorization header when a token is set
  env.agent = {
    post: (path) => {
      const req = supertest(app).post(path)
      if (env.authToken) req.set('Authorization', `Bearer ${env.authToken}`)
      return req
    },
    get: (path) => {
      const req = supertest(app).get(path)
      if (env.authToken) req.set('Authorization', `Bearer ${env.authToken}`)
      return req
    },
    delete: (path) => {
      const req = supertest(app).delete(path)
      if (env.authToken) req.set('Authorization', `Bearer ${env.authToken}`)
      return req
    },
  }

  return env
}

/**
 * Registers a fresh user, stores the JWT in env.authToken for subsequent
 * requests, and returns identifying data.
 */
async function registerUser(env: TestEnv, overrides?: { username?: string }) {
  const kp = generateSignKeyPair()
  const token = env.tokenStore.create('register')
  const { payload } = makeRegistrationPayload(token, kp, overrides)

  const res = await supertest(env.app).post('/register').send(payload).expect(200)
  env.authToken = res.body.token as string
  return { ...(res.body as { userID: string; username: string; lastSeen: string; token: string }), kp, payload }
}

// ---------------------------------------------------------------------------
// Auth routes
// ---------------------------------------------------------------------------

describe('POST /register', () => {
  it('creates a user and returns user data with JWT', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    expect(user.userID).toBeTypeOf('string')
    expect(user.username).toBe('alice')
    expect(user.token).toBeTypeOf('string')

    // JWT is usable for authenticated requests
    const whoami = await env.agent.post('/whoami').expect(200)
    expect(whoami.body.userID).toBe(user.userID)
  })

  it('returns 409 on duplicate username', async () => {
    const env = await makeEnv()
    await registerUser(env, { username: 'alice' })

    const kp2 = generateSignKeyPair()
    const token2 = env.tokenStore.create('register')
    const { payload: payload2 } = makeRegistrationPayload(token2, kp2, { username: 'alice' })
    await supertest(env.app).post('/register').send(payload2).expect(409)
  })
})

describe('POST /auth', () => {
  it('returns 200 and JWT on valid credentials', async () => {
    const env = await makeEnv()
    await registerUser(env, { username: 'bob' })

    const res = await supertest(env.app)
      .post('/auth')
      .send({ username: 'bob', password: 'password123' })
      .expect(200)
    expect(res.body.username).toBe('bob')
    expect(res.body.token).toBeTypeOf('string')
  })

  it('returns 401 on invalid password', async () => {
    const env = await makeEnv()
    await registerUser(env, { username: 'charlie' })

    await supertest(env.app)
      .post('/auth')
      .send({ username: 'charlie', password: 'wrongpassword' })
      .expect(401)
  })

  it('returns 401 for unknown username', async () => {
    const env = await makeEnv()
    await supertest(env.app)
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
    await supertest(env.app).post('/whoami').expect(401)
  })
})

describe('POST /goodbye', () => {
  it('clears the auth cookie and returns 200', async () => {
    const env = await makeEnv()
    await registerUser(env)
    await env.agent.post('/goodbye').expect(200)
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
    await supertest(env.app).get('/token/file').expect(401)
  })
})

// ---------------------------------------------------------------------------
// User routes
// ---------------------------------------------------------------------------

describe('GET /users/search', () => {
  it('returns users matching the query', async () => {
    const env = await makeEnv()
    await registerUser(env, { username: 'alice' })

    const res = await env.agent.get('/users/search?q=ali').expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.some((u: { username: string }) => u.username === 'alice')).toBe(true)
  })

  it('returns empty array for no matches', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const res = await env.agent.get('/users/search?q=zzznomatch').expect(200)
    expect(res.body).toEqual([])
  })

  it('returns empty array when q is empty', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const res = await env.agent.get('/users/search?q=').expect(200)
    expect(res.body).toEqual([])
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(env.app).get('/users/search?q=alice').expect(401)
  })
})

describe('GET /user/:id/servers', () => {
  it('returns servers the user is a member of', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    await env.agent.post('/server').send({ name: 'MyServer', icon: 'i.png' }).expect(200)

    const res = await env.agent.get(`/user/${user.userID}/servers`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body.length).toBeGreaterThanOrEqual(1)
    expect(res.body[0].name).toBe('MyServer')
  })

  it('returns empty array for a user with no servers', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const res = await env.agent.get(`/user/${user.userID}/servers`).expect(200)
    expect(res.body).toEqual([])
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(env.app).get(`/user/${uuidv4()}/servers`).expect(401)
  })
})

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
      const otkPair = generateSignKeyPair()
      const sig = signMessage(otkPair.publicKey, user.kp.secretKey)
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
// Keys routes
// ---------------------------------------------------------------------------

describe('GET /keys/:deviceID', () => {
  it('returns key bundle for a registered device with a pre-key', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const devicesRes = await env.agent.get(`/user/${user.userID}/devices`).expect(200)
    const deviceID = devicesRes.body[0].deviceID

    const res = await env.agent.get(`/keys/${deviceID}`).expect(200)
    expect(res.body.signKey).toBeTypeOf('string')
    expect(res.body.preKey).toBeDefined()
    expect(res.body.preKey.publicKey).toBeTypeOf('string')
    expect(res.body.otk).toBeNull() // no OTKs uploaded yet
  })

  it('returns 404 for a device with no pre-key', async () => {
    await env404()

    async function env404() {
      const env = await makeEnv()
      await registerUser(env)
      await env.agent.get(`/keys/${uuidv4()}`).expect(404)
    }
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(env.app).get(`/keys/${uuidv4()}`).expect(401)
  })
})

// ---------------------------------------------------------------------------
// Mail routes
// ---------------------------------------------------------------------------

function makeMailPayload(recipientDeviceID: string, senderSignKey: string) {
  return {
    mailID: uuidv4(),
    nonce: uuidv4(),
    recipient: recipientDeviceID,
    sender: senderSignKey,
    header: 'aabbccdd',
    cipher: 'deadbeef',
    mailType: 'direct',
    time: new Date().toISOString(),
    group: null,
    extra: null,
    forward: null,
    authorID: uuidv4(),
    readerID: uuidv4(),
  }
}

describe('POST /mail', () => {
  it('stores a mail message and returns { ok: true }', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const devicesRes = await env.agent.get(`/user/${user.userID}/devices`).expect(200)
    const deviceID = devicesRes.body[0].deviceID

    const payload = makeMailPayload(deviceID, Buffer.from(user.kp.publicKey).toString('hex'))
    const res = await env.agent.post('/mail').send(payload).expect(200)
    expect(res.body.ok).toBe(true)
  })

  it('returns 400 for a missing required field', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const devicesRes = await env.agent.get(`/user/${user.userID}/devices`).expect(200)
    const deviceID = devicesRes.body[0].deviceID

    const { cipher: _omit, ...incomplete } = makeMailPayload(deviceID, 'abc')
    await env.agent.post('/mail').send(incomplete).expect(400)
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(env.app).post('/mail').send({}).expect(401)
  })
})

describe('GET /mail/:deviceID', () => {
  it('returns pending mail for the device', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const devicesRes = await env.agent.get(`/user/${user.userID}/devices`).expect(200)
    const deviceID = devicesRes.body[0].deviceID

    const signKeyHex = Buffer.from(user.kp.publicKey).toString('hex')
    await env.agent.post('/mail').send(makeMailPayload(deviceID, signKeyHex)).expect(200)
    await env.agent.post('/mail').send(makeMailPayload(deviceID, signKeyHex)).expect(200)

    const res = await env.agent.get(`/mail/${deviceID}`).expect(200)
    expect(Array.isArray(res.body)).toBe(true)
    expect(res.body).toHaveLength(2)
  })

  it('returns empty array when no pending mail', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const res = await env.agent.get(`/mail/${uuidv4()}`).expect(200)
    expect(res.body).toEqual([])
  })

  it('consumes mail on retrieval (relay model)', async () => {
    const env = await makeEnv()
    const user = await registerUser(env)

    const devicesRes = await env.agent.get(`/user/${user.userID}/devices`).expect(200)
    const deviceID = devicesRes.body[0].deviceID

    await env.agent
      .post('/mail')
      .send(makeMailPayload(deviceID, Buffer.from(user.kp.publicKey).toString('hex')))
      .expect(200)

    await env.agent.get(`/mail/${deviceID}`).expect(200)
    const second = await env.agent.get(`/mail/${deviceID}`).expect(200)
    expect(second.body).toEqual([])
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(env.app).get(`/mail/${uuidv4()}`).expect(401)
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
    await supertest(env.app)
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
    await registerUser(env)

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
    await supertest(env.app).get(`/server/${uuidv4()}/permissions`).expect(401)
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
    await supertest(env.app)
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

describe('DELETE /server/:serverID/invites/:inviteID', () => {
  it('deletes an invite as the creator', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent.post('/server').send({ name: 'S', icon: 'x.png' }).expect(200)
    const serverID = serverRes.body.serverID

    const inviteRes = await env.agent
      .post(`/server/${serverID}/invites`)
      .send({ expiration: null })
      .expect(200)

    await env.agent
      .delete(`/server/${serverID}/invites/${inviteRes.body.inviteID}`)
      .expect(200)

    const list = await env.agent.get(`/server/${serverID}/invites`).expect(200)
    expect(list.body).toHaveLength(0)
  })

  it('returns 404 for non-existent invite', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent.post('/server').send({ name: 'S', icon: 'x.png' }).expect(200)
    await env.agent.delete(`/server/${serverRes.body.serverID}/invites/${uuidv4()}`).expect(404)
  })
})

describe('GET /invite/:inviteID', () => {
  it('returns invite details with server name (no auth required)', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent.post('/server').send({ name: 'TestServer', icon: 'x.png' }).expect(200)
    const inviteRes = await env.agent
      .post(`/server/${serverRes.body.serverID}/invites`)
      .send({ expiration: null })
      .expect(200)

    // No auth — use raw supertest
    const res = await supertest(env.app)
      .get(`/invite/${inviteRes.body.inviteID}`)
      .expect(200)

    expect(res.body.inviteID).toBe(inviteRes.body.inviteID)
    expect(res.body.serverName).toBe('TestServer')
  })

  it('returns 404 for expired invite', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent.post('/server').send({ name: 'S', icon: 'x.png' }).expect(200)
    const inviteRes = await env.agent
      .post(`/server/${serverRes.body.serverID}/invites`)
      .send({ expiration: '2020-01-01T00:00:00.000Z' })
      .expect(200)

    await supertest(env.app).get(`/invite/${inviteRes.body.inviteID}`).expect(404)
  })
})

describe('POST /invite/:inviteID/join', () => {
  it('adds the user to the server via invite', async () => {
    const env = await makeEnv()
    await registerUser(env, { username: 'owner' })

    const serverRes = await env.agent.post('/server').send({ name: 'JoinMe', icon: 'x.png' }).expect(200)
    const serverID = serverRes.body.serverID

    const inviteRes = await env.agent
      .post(`/server/${serverID}/invites`)
      .send({ expiration: null })
      .expect(200)

    // Register a second user
    await registerUser(env, { username: 'joiner' })

    const res = await env.agent.post(`/invite/${inviteRes.body.inviteID}/join`).expect(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.server.serverID).toBe(serverID)
    expect(res.body.server.name).toBe('JoinMe')
  })

  it('returns 409 if already a member', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent.post('/server').send({ name: 'S', icon: 'x.png' }).expect(200)
    const inviteRes = await env.agent
      .post(`/server/${serverRes.body.serverID}/invites`)
      .send({ expiration: null })
      .expect(200)

    // Creator is already a member (power level 100)
    await env.agent.post(`/invite/${inviteRes.body.inviteID}/join`).expect(409)
  })

  it('returns 404 for expired invite', async () => {
    const env = await makeEnv()
    await registerUser(env)

    const serverRes = await env.agent.post('/server').send({ name: 'S', icon: 'x.png' }).expect(200)
    const inviteRes = await env.agent
      .post(`/server/${serverRes.body.serverID}/invites`)
      .send({ expiration: '2020-01-01T00:00:00.000Z' })
      .expect(200)

    await env.agent.post(`/invite/${inviteRes.body.inviteID}/join`).expect(404)
  })

  it('returns 401 when not authenticated', async () => {
    const env = await makeEnv()
    await supertest(env.app).post(`/invite/${uuidv4()}/join`).expect(401)
  })
})
