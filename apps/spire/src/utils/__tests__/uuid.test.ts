import { describe, it, expect } from 'vitest'
import { stringify as uuidStringify } from 'uuid'
import { createUUID, uuidToUint8 } from '../uuid.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('createUUID', () => {
  it('returns a valid UUID v4 string', () => {
    const id = createUUID()
    expect(id).toMatch(UUID_RE)
  })

  it('returns a different value on each call', () => {
    const a = createUUID()
    const b = createUUID()
    expect(a).not.toBe(b)
  })
})

describe('uuidToUint8', () => {
  it('returns a Uint8Array of length 16', () => {
    const bytes = uuidToUint8('550e8400-e29b-41d4-a716-446655440000')
    expect(bytes).toBeInstanceOf(Uint8Array)
    expect(bytes).toHaveLength(16)
  })

  it('round-trips with uuid stringify', () => {
    const original = createUUID()
    const bytes = uuidToUint8(original)
    expect(uuidStringify(bytes)).toBe(original)
  })
})
