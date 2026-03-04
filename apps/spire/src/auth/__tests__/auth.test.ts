import { describe, expect, it, test } from 'vitest'
import nacl from 'tweetnacl'
import { stringify as uuidStringify, v4 as uuidv4 } from 'uuid'
import { decodeJwt } from 'jose'
import { useDb } from '#test/helpers/db.js'
import { makeRegistrationPayload } from '#test/helpers/factories.js'
import {
  createTokenStore,
  decodeHex,
  encodeHex,
  hashPassword,
  loginUser,
  registerUser,
  verifyNaClSignature,
  verifyPassword,
} from '../index.js'

// ---------------------------------------------------------------------------
// decodeHex / encodeHex
// ---------------------------------------------------------------------------

describe('hex utilities', () => {
  it('encodeHex produces lowercase hex string', () => {
    const bytes = new Uint8Array([0x0f, 0xab, 0xcd])
    expect(encodeHex(bytes)).toBe('0fabcd')
  })

  it('decodeHex round-trips through encodeHex', () => {
    const bytes = new Uint8Array(32).fill(0xaa)
    expect(decodeHex(encodeHex(bytes))).toEqual(bytes)
  })
})

// ---------------------------------------------------------------------------
// verifyNaClSignature
// ---------------------------------------------------------------------------

describe('verifyNaClSignature', () => {
  it('returns the original message for a valid signature', () => {
    const kp = nacl.sign.keyPair()
    const msg = new Uint8Array([1, 2, 3, 4])
    const signed = nacl.sign(msg, kp.secretKey)
    expect(verifyNaClSignature(signed, kp.publicKey)).toEqual(msg)
  })

  it('returns null for a signature from the wrong key', () => {
    const kp = nacl.sign.keyPair()
    const wrong = nacl.sign.keyPair()
    const signed = nacl.sign(new Uint8Array([1, 2, 3]), kp.secretKey)
    expect(verifyNaClSignature(signed, wrong.publicKey)).toBeNull()
  })

  it('returns null for a tampered signed message', () => {
    const kp = nacl.sign.keyPair()
    const signed = nacl.sign(new Uint8Array([1, 2, 3]), kp.secretKey)
    signed[70]! ^= 0xff
    expect(verifyNaClSignature(signed, kp.publicKey)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// createTokenStore
// ---------------------------------------------------------------------------

describe('createTokenStore', () => {
  it('creates a token with the correct scope', () => {
    const store = createTokenStore()
    const token = store.create('register')
    expect(token.key).toBeTypeOf('string')
    expect(token.scope).toBe('register')
    expect(token.time).toBeInstanceOf(Date)
  })

  it('validates a token of the correct scope', () => {
    const store = createTokenStore()
    const token = store.create('file')
    expect(store.validate(token.key, 'file')).toBe(true)
  })

  it('is single-use — second validation of the same token fails', () => {
    const store = createTokenStore()
    const token = store.create('device')
    store.validate(token.key, 'device') // consume
    expect(store.validate(token.key, 'device')).toBe(false)
  })

  it('rejects wrong scope', () => {
    const store = createTokenStore()
    const token = store.create('file')
    expect(store.validate(token.key, 'avatar')).toBe(false)
  })

  it('rejects unknown key', () => {
    const store = createTokenStore()
    expect(store.validate(uuidv4(), 'register')).toBe(false)
  })

  it('store instances are isolated — tokens do not bleed between stores', () => {
    const storeA = createTokenStore()
    const storeB = createTokenStore()
    const token = storeA.create('register')
    expect(storeB.validate(token.key, 'register')).toBe(false)
  })

  it('supports all seven token types', () => {
    const types = ['file', 'avatar', 'register', 'device', 'invite', 'emoji', 'connect'] as const
    for (const type of types) {
      const store = createTokenStore()
      const token = store.create(type)
      expect(store.validate(token.key, type)).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// hashPassword / verifyPassword
// ---------------------------------------------------------------------------

describe('hashPassword / verifyPassword', () => {
  it('returns hex-encoded hash and salt', async () => {
    const result = await hashPassword('password')
    expect(result.hash).toMatch(/^[0-9a-f]+$/)
    expect(result.salt).toMatch(/^[0-9a-f]+$/)
  })

  it('hash is 32 bytes (64 hex chars) — matches upstream PBKDF2 output length', async () => {
    const { hash } = await hashPassword('password')
    expect(hash).toHaveLength(64)
  })

  it('same password produces different hashes (random salt)', async () => {
    const a = await hashPassword('password')
    const b = await hashPassword('password')
    expect(a.hash).not.toBe(b.hash)
    expect(a.salt).not.toBe(b.salt)
  })

  it('verifyPassword returns true for the correct password', async () => {
    const { hash, salt } = await hashPassword('correct-horse')
    expect(await verifyPassword('correct-horse', hash, salt)).toBe(true)
  })

  it('verifyPassword returns false for the wrong password', async () => {
    const { hash, salt } = await hashPassword('correct-horse')
    expect(await verifyPassword('wrong-horse', hash, salt)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// registerUser
// ---------------------------------------------------------------------------

describe('registerUser', () => {
  it('creates a user whose userID equals uuid.stringify(regKey)', async () => {
    const db = await useDb()
    const store = createTokenStore()
    const kp = nacl.sign.keyPair()
    const token = store.create('register')
    const { regKey, payload } = makeRegistrationPayload(token, kp)

    const user = await registerUser(db, regKey, payload)
    expect(user.userID).toBe(uuidStringify(regKey))
    expect(user.username).toBe('alice')
  })

  it('userID equals the original registration token UUID — derived from client crypto', async () => {
    const db = await useDb()
    const store = createTokenStore()
    const kp = nacl.sign.keyPair()
    const token = store.create('register')
    const { regKey, payload } = makeRegistrationPayload(token, kp)

    const user = await registerUser(db, regKey, payload)
    // The userID IS the registration token key, proved by the client's NaCl signature
    expect(user.userID).toBe(token.key)
  })

  it('stores password as hash+salt — never plaintext', async () => {
    const db = await useDb()
    const store = createTokenStore()
    const kp = nacl.sign.keyPair()
    const token = store.create('register')
    const { regKey, payload } = makeRegistrationPayload(token, kp)

    await registerUser(db, regKey, payload)
    const row = await db.selectFrom('users').where('username', '=', 'alice').selectAll().executeTakeFirst()
    expect(row?.passwordHash).not.toBe('password123')
    expect(row?.passwordHash).toHaveLength(64) // 32 bytes hex
    expect(row?.passwordSalt.length).toBeGreaterThan(0)
  })

  it('creates a device and preKey atomically with the user', async () => {
    const db = await useDb()
    const store = createTokenStore()
    const kp = nacl.sign.keyPair()
    const token = store.create('register')
    const { regKey, payload } = makeRegistrationPayload(token, kp)

    const user = await registerUser(db, regKey, payload)

    const device = await db.selectFrom('devices').where('owner', '=', user.userID).selectAll().executeTakeFirst()
    expect(device).toBeDefined()
    expect(device?.signKey).toBe(payload.signKey)
    expect(device?.name).toBe('test-device')
    expect(device?.deleted).toBe(0)

    const preKey = await db.selectFrom('preKeys').where('userID', '=', user.userID).selectAll().executeTakeFirst()
    expect(preKey).toBeDefined()
    expect(preKey?.publicKey).toBe(payload.preKey)
    expect(preKey?.index).toBe(0)
  })

  it('rejects duplicate username', async () => {
    const db = await useDb()
    const store = createTokenStore()

    const kp1 = nacl.sign.keyPair()
    const t1 = store.create('register')
    const { regKey: rk1, payload: p1 } = makeRegistrationPayload(t1, kp1)
    await registerUser(db, rk1, p1)

    const kp2 = nacl.sign.keyPair()
    const t2 = store.create('register')
    const { regKey: rk2, payload: p2 } = makeRegistrationPayload(t2, kp2, { username: 'alice' })
    await expect(registerUser(db, rk2, p2)).rejects.toThrow()
  })

  it('rejects duplicate signKey', async () => {
    const db = await useDb()
    const store = createTokenStore()
    const kp = nacl.sign.keyPair() // same key pair used twice

    const t1 = store.create('register')
    const { regKey: rk1, payload: p1 } = makeRegistrationPayload(t1, kp, { username: 'alice' })
    await registerUser(db, rk1, p1)

    const t2 = store.create('register')
    const { regKey: rk2, payload: p2 } = makeRegistrationPayload(t2, kp, { username: 'bob' })
    await expect(registerUser(db, rk2, p2)).rejects.toThrow()
  })

  test.each([
    ['ab', 'too short (< 3 chars)'],
    ['a'.repeat(20), 'too long (> 19 chars)'],
    ['ali ce', 'contains space'],
    ['ali-ce', 'contains hyphen'],
    ['alice!', 'contains special char'],
  ])('rejects invalid username "%s" — %s', async (username) => {
    const db = await useDb()
    const store = createTokenStore()
    const t = store.create('register')
    const { regKey, payload } = makeRegistrationPayload(t, nacl.sign.keyPair(), { username })
    await expect(registerUser(db, regKey, payload)).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// loginUser
// ---------------------------------------------------------------------------

describe('loginUser', () => {
  async function seedUser(db: Awaited<ReturnType<typeof useDb>>) {
    const store = createTokenStore()
    const kp = nacl.sign.keyPair()
    const token = store.create('register')
    const { regKey, payload } = makeRegistrationPayload(token, kp)
    return registerUser(db, regKey, payload)
  }

  it('returns a JWT string on correct credentials', async () => {
    const db = await useDb()
    await seedUser(db)
    const token = await loginUser(db, 'alice', 'password123')
    expect(token).toBeTypeOf('string')
    expect(token).not.toBeNull()
  })

  it('JWT payload is censoredUser — { user: { userID, username, lastSeen } } with no sensitive fields', async () => {
    const db = await useDb()
    const user = await seedUser(db)
    const token = await loginUser(db, 'alice', 'password123')
    const payload = decodeJwt(token!)
    const u = payload.user as Record<string, unknown>
    expect(u.userID).toBe(user.userID)
    expect(u.username).toBe('alice')
    expect(u).not.toHaveProperty('passwordHash')
    expect(u).not.toHaveProperty('passwordSalt')
  })

  it('JWT expiry is ~7 days from now', async () => {
    const db = await useDb()
    await seedUser(db)
    const token = await loginUser(db, 'alice', 'password123')
    const payload = decodeJwt(token!)
    const sevenDays = 7 * 24 * 60 * 60
    const now = Math.floor(Date.now() / 1000)
    expect(payload.exp).toBeGreaterThan(now + sevenDays - 60)
    expect(payload.exp).toBeLessThanOrEqual(now + sevenDays + 60)
  })

  it('returns null for wrong password', async () => {
    const db = await useDb()
    await seedUser(db)
    expect(await loginUser(db, 'alice', 'wrongpass')).toBeNull()
  })

  it('returns null for unknown username', async () => {
    const db = await useDb()
    expect(await loginUser(db, 'nobody', 'password123')).toBeNull()
  })
})
