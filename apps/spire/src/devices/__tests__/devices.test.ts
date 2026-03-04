import { describe, expect, it, test } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import nacl from 'tweetnacl'
import { useDb } from '#test/helpers/db.js'
import { makeDevicePayload, seedUser } from '#test/helpers/factories.js'
import {
  createDevice,
  deleteDevice,
  markDeviceLogin,
  retrieveDevice,
  retrieveDeviceBySignKey,
  retrieveUserDeviceList,
} from '../devices.service.js'

// ---------------------------------------------------------------------------
// createDevice
// ---------------------------------------------------------------------------

describe('createDevice', () => {
  it('creates a device row with correct fields', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const payload = makeDevicePayload()

    const device = await createDevice(db, owner, payload)

    expect(device.deviceID).toBeTypeOf('string')
    expect(device.signKey).toBe(payload.signKey)
    expect(device.owner).toBe(owner)
    expect(device.name).toBe('test-device')
    expect(device.deleted).toBe(0)
    expect(device.lastLogin).toBeNull()
  })

  it('also inserts a preKey row atomically', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const payload = makeDevicePayload({ preKeyIndex: 3 })

    const device = await createDevice(db, owner, payload)

    const preKey = await db
      .selectFrom('preKeys')
      .where('deviceID', '=', device.deviceID)
      .selectAll()
      .executeTakeFirst()

    expect(preKey).toBeDefined()
    expect(preKey?.publicKey).toBe(payload.preKey)
    expect(preKey?.index).toBe(3)
    expect(preKey?.userID).toBe(owner)
  })

  it('rejects duplicate signKey', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const payload = makeDevicePayload()

    await createDevice(db, owner, payload)
    await expect(createDevice(db, owner, payload)).rejects.toThrow()
  })

})

// ---------------------------------------------------------------------------
// retrieveDevice
// ---------------------------------------------------------------------------

describe('retrieveDevice', () => {
  it('returns the device by deviceID', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    const found = await retrieveDevice(db, device.deviceID)
    expect(found).not.toBeNull()
    expect(found?.deviceID).toBe(device.deviceID)
    expect(found?.signKey).toBe(device.signKey)
  })

  it('returns null for unknown deviceID', async () => {
    const db = await useDb()
    expect(await retrieveDevice(db, uuidv4())).toBeNull()
  })

  it('returns null for soft-deleted devices', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    await deleteDevice(db, device.deviceID)

    expect(await retrieveDevice(db, device.deviceID)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// retrieveDeviceBySignKey
// ---------------------------------------------------------------------------

describe('retrieveDeviceBySignKey', () => {
  it('returns the device by its signKey', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const payload = makeDevicePayload()
    const device = await createDevice(db, owner, payload)

    const found = await retrieveDeviceBySignKey(db, payload.signKey)
    expect(found?.deviceID).toBe(device.deviceID)
  })

  it('returns null for unknown signKey', async () => {
    const db = await useDb()
    const kp = nacl.sign.keyPair()
    expect(await retrieveDeviceBySignKey(db, Buffer.from(kp.publicKey).toString('hex'))).toBeNull()
  })

  it('returns null for a soft-deleted device', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const payload = makeDevicePayload()
    const device = await createDevice(db, owner, payload)

    await deleteDevice(db, device.deviceID)

    expect(await retrieveDeviceBySignKey(db, payload.signKey)).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// retrieveUserDeviceList
// ---------------------------------------------------------------------------

describe('retrieveUserDeviceList', () => {
  it('returns all non-deleted devices for a user', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    await createDevice(db, owner, makeDevicePayload())
    await createDevice(db, owner, makeDevicePayload())

    const devices = await retrieveUserDeviceList(db, owner)
    expect(devices).toHaveLength(2)
    expect(devices.every(d => d.owner === owner)).toBe(true)
  })

  it('excludes soft-deleted devices', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const d1 = await createDevice(db, owner, makeDevicePayload())
    const d2 = await createDevice(db, owner, makeDevicePayload())
    await deleteDevice(db, d1.deviceID)

    const devices = await retrieveUserDeviceList(db, owner)
    expect(devices).toHaveLength(1)
    expect(devices[0]!.deviceID).toBe(d2.deviceID)
  })

  it('returns empty array for unknown user', async () => {
    const db = await useDb()
    expect(await retrieveUserDeviceList(db, uuidv4())).toEqual([])
  })

  it('does not return devices belonging to other users', async () => {
    const db = await useDb()
    const owner1 = await seedUser(db)
    const owner2 = await seedUser(db)
    await createDevice(db, owner1, makeDevicePayload())
    await createDevice(db, owner2, makeDevicePayload())

    const devices = await retrieveUserDeviceList(db, owner1)
    expect(devices).toHaveLength(1)
    expect(devices[0]!.owner).toBe(owner1)
  })
})

// ---------------------------------------------------------------------------
// deleteDevice
// ---------------------------------------------------------------------------

describe('deleteDevice', () => {
  it('soft-deletes: sets deleted=1, row still exists in DB', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    await deleteDevice(db, device.deviceID)

    const row = await db
      .selectFrom('devices')
      .where('deviceID', '=', device.deviceID)
      .select('deleted')
      .executeTakeFirst()

    expect(row).toBeDefined()
    expect(row?.deleted).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// markDeviceLogin
// ---------------------------------------------------------------------------

describe('markDeviceLogin', () => {
  it('updates lastLogin from null to a current ISO timestamp', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    expect(device.lastLogin).toBeNull()

    const before = Date.now()
    await markDeviceLogin(db, device.deviceID)
    const after = Date.now()

    const row = await db
      .selectFrom('devices')
      .where('deviceID', '=', device.deviceID)
      .select('lastLogin')
      .executeTakeFirst()

    expect(row?.lastLogin).not.toBeNull()
    const loginTime = new Date(row!.lastLogin!).getTime()
    expect(loginTime).toBeGreaterThanOrEqual(before)
    expect(loginTime).toBeLessThanOrEqual(after)
  })
})
