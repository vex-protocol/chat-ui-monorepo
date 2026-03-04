import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { parseConfig } from '../config.ts'

const VALID_BASE = {
  DB_TYPE: 'sqlite',
  SPK: 'a'.repeat(64),
  JWT_SECRET: 'x'.repeat(32),
} satisfies Record<string, string>

describe('parseConfig', () => {
  it('returns a typed config object for valid env vars', () => {
    const config = parseConfig(VALID_BASE)
    expect(config.DB_TYPE).toBe('sqlite')
    expect(config.SPK).toBe('a'.repeat(64))
    expect(config.JWT_SECRET).toBe('x'.repeat(32))
  })

  it('DB_TYPE=sqlite with no DATABASE_URL is valid', () => {
    expect(() => parseConfig(VALID_BASE)).not.toThrow()
  })

  it('DB_TYPE=postgres without DATABASE_URL throws ZodError', () => {
    expect(() =>
      parseConfig({ ...VALID_BASE, DB_TYPE: 'postgres' }),
    ).toThrow(z.ZodError)
  })

  it('DB_TYPE=postgres with DATABASE_URL is valid', () => {
    const config = parseConfig({
      ...VALID_BASE,
      DB_TYPE: 'postgres',
      DATABASE_URL: 'postgres://localhost/vex',
    })
    expect(config.DB_TYPE).toBe('postgres')
    expect(config.DATABASE_URL).toBe('postgres://localhost/vex')
  })

  it('missing SPK throws ZodError', () => {
    const { SPK: _, ...noSpk } = VALID_BASE
    expect(() => parseConfig(noSpk)).toThrow(z.ZodError)
  })

  it('missing JWT_SECRET throws ZodError', () => {
    const { JWT_SECRET: _, ...noJwt } = VALID_BASE
    expect(() => parseConfig(noJwt)).toThrow(z.ZodError)
  })

  it('JWT_SECRET shorter than 32 chars throws ZodError', () => {
    expect(() =>
      parseConfig({ ...VALID_BASE, JWT_SECRET: 'tooshort' }),
    ).toThrow(z.ZodError)
  })

  it('API_PORT coerces string to number', () => {
    const config = parseConfig({ ...VALID_BASE, API_PORT: '3000' })
    expect(config.API_PORT).toBe(3000)
    expect(typeof config.API_PORT).toBe('number')
  })

  it('LOG_LEVEL defaults to info when not set', () => {
    const config = parseConfig(VALID_BASE)
    expect(config.LOG_LEVEL).toBe('info')
  })

  it('NODE_ENV defaults to development when not set', () => {
    const config = parseConfig(VALID_BASE)
    expect(config.NODE_ENV).toBe('development')
  })

  it('SPK and JWT_SECRET are separate fields on the config object', () => {
    const config = parseConfig({
      ...VALID_BASE,
      SPK: 's'.repeat(64),
      JWT_SECRET: 'j'.repeat(32),
    })
    expect(config.SPK).toBe('s'.repeat(64))
    expect(config.JWT_SECRET).toBe('j'.repeat(32))
    expect(config.SPK).not.toBe(config.JWT_SECRET)
  })
})
