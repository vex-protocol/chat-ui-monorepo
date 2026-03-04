import { describe, it, expect } from 'vitest'
import nacl from 'tweetnacl'
import { useDb } from '#test/helpers/db.ts'
import { seedUser, seedDevice, makeDevicePayload } from '#test/helpers/factories.ts'
import { createDevice } from '#devices/devices.service.ts'
import {
  savePreKey,
  getPreKey,
  saveOTKs,
  consumeOTK,
  getOTKCount,
  getKeyBundle,
} from '../keys.service.ts'

/** Generates a 64 lowercase hex char string (32-byte NaCl public key). */
function makeHexKey(): string {
  return Buffer.from(nacl.sign.keyPair().publicKey).toString('hex')
}

/** Generates a valid OTK payload entry. */
function makeOTKEntry(index: number) {
  return {
    publicKey: makeHexKey(),
    signature: makeHexKey(), // hex signature (64 chars)
    index,
  }
}

// ---------------------------------------------------------------------------
// savePreKey / getPreKey
// ---------------------------------------------------------------------------

describe('savePreKey', () => {
  it('stores a pre-key row for the device', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())
    const pk = makeHexKey()

    await savePreKey(db, owner, device.deviceID, pk, makeHexKey(), 0)

    const row = await getPreKey(db, device.deviceID)
    expect(row).not.toBeNull()
    expect(row?.publicKey).toBe(pk)
    expect(row?.index).toBe(0)
  })

  it('replaces an existing pre-key when saved again for the same device', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    const pk1 = makeHexKey()
    const pk2 = makeHexKey()

    await savePreKey(db, owner, device.deviceID, pk1, makeHexKey(), 0)
    await savePreKey(db, owner, device.deviceID, pk2, makeHexKey(), 1)

    const row = await getPreKey(db, device.deviceID)
    expect(row?.publicKey).toBe(pk2)
    expect(row?.index).toBe(1)

    // Only one row should exist
    const rows = await db
      .selectFrom('preKeys')
      .where('deviceID', '=', device.deviceID)
      .selectAll()
      .execute()
    expect(rows).toHaveLength(1)
  })
})

describe('getPreKey', () => {
  it('returns null for a device with no pre-key', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await seedDevice(db, owner)

    expect(await getPreKey(db, device.deviceID)).toBeNull()
  })

  it('returns the pre-key with correct fields', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())
    const pk = makeHexKey()
    const sig = makeHexKey()

    await savePreKey(db, owner, device.deviceID, pk, sig, 7)

    const row = await getPreKey(db, device.deviceID)
    expect(row?.publicKey).toBe(pk)
    expect(row?.signature).toBe(sig)
    expect(row?.index).toBe(7)
  })
})

// ---------------------------------------------------------------------------
// saveOTKs / consumeOTK / getOTKCount
// ---------------------------------------------------------------------------

describe('saveOTKs', () => {
  it('inserts multiple one-time keys for a device', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())
    const keys = [makeOTKEntry(0), makeOTKEntry(1), makeOTKEntry(2)]

    await saveOTKs(db, owner, device.deviceID, keys)

    expect(await getOTKCount(db, device.deviceID)).toBe(3)
  })

  it('does not affect OTKs for other devices', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const d1 = await createDevice(db, owner, makeDevicePayload())
    const d2 = await createDevice(db, owner, makeDevicePayload())

    await saveOTKs(db, owner, d1.deviceID, [makeOTKEntry(0)])

    expect(await getOTKCount(db, d2.deviceID)).toBe(0)
  })
})

describe('consumeOTK', () => {
  it('returns the OTK with the lowest index', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())
    const keys = [makeOTKEntry(5), makeOTKEntry(2), makeOTKEntry(8)]

    await saveOTKs(db, owner, device.deviceID, keys)

    const otk = await consumeOTK(db, device.deviceID)
    expect(otk?.index).toBe(2)
  })

  it('atomically deletes the returned OTK (count decrements by 1)', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    await saveOTKs(db, owner, device.deviceID, [makeOTKEntry(0), makeOTKEntry(1)])

    await consumeOTK(db, device.deviceID)
    expect(await getOTKCount(db, device.deviceID)).toBe(1)
  })

  it('returns null when no OTKs remain', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    expect(await consumeOTK(db, device.deviceID)).toBeNull()
  })

  it('returns null (not an error) after all OTKs are consumed', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    await saveOTKs(db, owner, device.deviceID, [makeOTKEntry(0)])
    await consumeOTK(db, device.deviceID)

    expect(await consumeOTK(db, device.deviceID)).toBeNull()
  })

  it('returns OTK with correct publicKey and signature', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())
    const entry = makeOTKEntry(0)

    await saveOTKs(db, owner, device.deviceID, [entry])

    const otk = await consumeOTK(db, device.deviceID)
    expect(otk?.publicKey).toBe(entry.publicKey)
    expect(otk?.signature).toBe(entry.signature)
  })
})

describe('getOTKCount', () => {
  it('returns 0 for a device with no OTKs', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    expect(await getOTKCount(db, device.deviceID)).toBe(0)
  })

  it('reflects the current count after saves and consumes', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    await saveOTKs(db, owner, device.deviceID, [makeOTKEntry(0), makeOTKEntry(1), makeOTKEntry(2)])
    expect(await getOTKCount(db, device.deviceID)).toBe(3)

    await consumeOTK(db, device.deviceID)
    expect(await getOTKCount(db, device.deviceID)).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// getKeyBundle
// ---------------------------------------------------------------------------

describe('getKeyBundle', () => {
  it('returns signKey, preKey, and a consumed OTK', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const payload = makeDevicePayload()
    const device = await createDevice(db, owner, payload)
    const pk = makeHexKey()
    const otkEntry = makeOTKEntry(0)

    await savePreKey(db, owner, device.deviceID, pk, makeHexKey(), 0)
    await saveOTKs(db, owner, device.deviceID, [otkEntry])

    const bundle = await getKeyBundle(db, device.deviceID)

    expect(bundle).not.toBeNull()
    expect(bundle?.signKey).toBe(device.signKey)
    expect(bundle?.preKey.publicKey).toBe(pk)
    expect(bundle?.otk?.publicKey).toBe(otkEntry.publicKey)
  })

  it('consumes the OTK — count decrements after getKeyBundle', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    await savePreKey(db, owner, device.deviceID, makeHexKey(), makeHexKey(), 0)
    await saveOTKs(db, owner, device.deviceID, [makeOTKEntry(0), makeOTKEntry(1)])

    await getKeyBundle(db, device.deviceID)

    expect(await getOTKCount(db, device.deviceID)).toBe(1)
  })

  it('returns otk: null (not an error) when no OTKs remain', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await createDevice(db, owner, makeDevicePayload())

    await savePreKey(db, owner, device.deviceID, makeHexKey(), makeHexKey(), 0)
    // No OTKs saved

    const bundle = await getKeyBundle(db, device.deviceID)

    expect(bundle).not.toBeNull()
    expect(bundle?.preKey).toBeDefined()
    expect(bundle?.otk).toBeNull()
  })

  it('returns null if device does not exist', async () => {
    const db = await useDb()
    expect(await getKeyBundle(db, 'nonexistent-device-id')).toBeNull()
  })

  it('returns null if device exists but has no pre-key', async () => {
    const db = await useDb()
    const owner = await seedUser(db)
    const device = await seedDevice(db, owner)

    expect(await getKeyBundle(db, device.deviceID)).toBeNull()
  })
})
