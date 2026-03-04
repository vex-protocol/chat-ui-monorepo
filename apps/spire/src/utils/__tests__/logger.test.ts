import { describe, it, expect } from 'vitest'
import { createLogger } from '../logger.ts'

describe('createLogger', () => {
  it('returns an object with standard pino logger methods', () => {
    const logger = createLogger('myservice')
    expect(logger).toHaveProperty('info')
    expect(logger).toHaveProperty('error')
    expect(logger).toHaveProperty('warn')
    expect(logger).toHaveProperty('debug')
    expect(logger).toHaveProperty('trace')
    expect(typeof logger.info).toBe('function')
  })

  it('binds service name as metadata', () => {
    const logger = createLogger('myservice')
    expect(logger.bindings()).toMatchObject({ service: 'myservice' })
  })

  it('binds different service names independently', () => {
    const a = createLogger('auth')
    const b = createLogger('devices')
    expect(a.bindings()).toMatchObject({ service: 'auth' })
    expect(b.bindings()).toMatchObject({ service: 'devices' })
  })
})
