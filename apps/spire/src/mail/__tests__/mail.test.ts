import { describe, it, expect } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { useDb } from '#test/helpers/db.js'
import type { MailPayload } from '../mail.service.js'
import { saveMail, retrieveMail, deleteMail } from '../mail.service.js'

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function makeMailPayload(overrides?: Partial<MailPayload>): MailPayload {
  return {
    nonce: uuidv4(),
    recipient: uuidv4(),
    mailID: uuidv4(),
    sender: uuidv4(),
    header: 'encrypted-header',
    cipher: 'encrypted-body',
    group: null,
    extra: null,
    mailType: 'direct',
    time: new Date().toISOString(),
    forward: null,
    authorID: uuidv4(),
    readerID: uuidv4(),
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// saveMail
// ---------------------------------------------------------------------------

describe('saveMail', () => {
  it('inserts a mail row with all required fields', async () => {
    const db = await useDb()
    const payload = makeMailPayload()

    await saveMail(db, payload)

    const row = await db
      .selectFrom('mail')
      .where('nonce', '=', payload.nonce)
      .selectAll()
      .executeTakeFirst()

    expect(row).toBeDefined()
    expect(row?.nonce).toBe(payload.nonce)
    expect(row?.recipient).toBe(payload.recipient)
    expect(row?.cipher).toBe(payload.cipher)
    expect(row?.mailType).toBe(payload.mailType)
  })

  it('rejects a duplicate nonce', async () => {
    const db = await useDb()
    const payload = makeMailPayload()

    await saveMail(db, payload)
    await expect(saveMail(db, payload)).rejects.toThrow()
  })

  it('throws when a required field is null (DB NOT NULL constraint)', async () => {
    const db = await useDb()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await expect(saveMail(db, { ...makeMailPayload(), cipher: null as any })).rejects.toThrow()
  })
})

// ---------------------------------------------------------------------------
// retrieveMail
// ---------------------------------------------------------------------------

describe('retrieveMail', () => {
  it('returns all pending mail for the recipient device', async () => {
    const db = await useDb()
    const deviceID = uuidv4()
    const m1 = makeMailPayload({ recipient: deviceID })
    const m2 = makeMailPayload({ recipient: deviceID })

    await saveMail(db, m1)
    await saveMail(db, m2)

    const mail = await retrieveMail(db, deviceID)
    expect(mail).toHaveLength(2)
    expect(mail.map(m => m.nonce)).toEqual(expect.arrayContaining([m1.nonce, m2.nonce]))
  })

  it('returns an empty array when the device has no pending mail', async () => {
    const db = await useDb()
    expect(await retrieveMail(db, uuidv4())).toEqual([])
  })

  it('deletes the returned rows from the DB (relay model)', async () => {
    const db = await useDb()
    const deviceID = uuidv4()
    await saveMail(db, makeMailPayload({ recipient: deviceID }))

    await retrieveMail(db, deviceID)

    const remaining = await db
      .selectFrom('mail')
      .where('recipient', '=', deviceID)
      .selectAll()
      .execute()
    expect(remaining).toHaveLength(0)
  })

  it('returns empty array on a second call after first retrieval', async () => {
    const db = await useDb()
    const deviceID = uuidv4()
    await saveMail(db, makeMailPayload({ recipient: deviceID }))

    await retrieveMail(db, deviceID)
    const second = await retrieveMail(db, deviceID)

    expect(second).toEqual([])
  })

  it('only returns mail addressed to the specified recipient', async () => {
    const db = await useDb()
    const deviceA = uuidv4()
    const deviceB = uuidv4()

    await saveMail(db, makeMailPayload({ recipient: deviceA }))
    await saveMail(db, makeMailPayload({ recipient: deviceB }))

    const mailForA = await retrieveMail(db, deviceA)
    expect(mailForA).toHaveLength(1)
    expect(mailForA[0]!.recipient).toBe(deviceA)
  })
})

// ---------------------------------------------------------------------------
// deleteMail
// ---------------------------------------------------------------------------

describe('deleteMail', () => {
  it('removes the mail row with the given nonce', async () => {
    const db = await useDb()
    const payload = makeMailPayload()
    await saveMail(db, payload)

    await deleteMail(db, payload.nonce)

    const row = await db
      .selectFrom('mail')
      .where('nonce', '=', payload.nonce)
      .selectAll()
      .executeTakeFirst()
    expect(row).toBeUndefined()
  })

  it('is a no-op when the nonce does not exist', async () => {
    const db = await useDb()
    await expect(deleteMail(db, uuidv4())).resolves.toBeUndefined()
  })
})
