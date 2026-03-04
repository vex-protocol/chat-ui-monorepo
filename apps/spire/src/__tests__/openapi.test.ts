/**
 * OpenAPI spec shape tests.
 *
 * These tests call generateOpenAPIDocument() and assert the generated document
 * has the expected structure and path coverage. Path coverage tests are
 * intentionally RED until route OpenAPI registrations are added.
 */
import { describe, it, expect, beforeAll } from 'vitest'
// openapi.ts calls extendZodWithOpenApi(z) and side-effect-imports all route
// files so their registerPath() calls execute before generateOpenAPIDocument().
import { generateOpenAPIDocument } from '../openapi.ts'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let doc: any

beforeAll(() => {
  doc = generateOpenAPIDocument()
})

// ---------------------------------------------------------------------------
// Document structure
// ---------------------------------------------------------------------------

describe('OpenAPI document structure', () => {
  it('openapi version is 3.1.0', () => {
    expect(doc.openapi).toBe('3.1.0')
  })

  it('info.title and info.version are present', () => {
    expect(doc.info.title).toBeTypeOf('string')
    expect(doc.info.version).toBeTypeOf('string')
  })

  it('servers array is non-empty', () => {
    expect(Array.isArray(doc.servers)).toBe(true)
    expect(doc.servers.length).toBeGreaterThan(0)
  })

  it('components.securitySchemes.bearerAuth is defined', () => {
    expect(doc.components?.securitySchemes?.bearerAuth).toBeDefined()
    expect(doc.components.securitySchemes.bearerAuth.type).toBe('http')
    expect(doc.components.securitySchemes.bearerAuth.scheme).toBe('bearer')
  })
})

// ---------------------------------------------------------------------------
// Path coverage
// ---------------------------------------------------------------------------

const expectedPaths = [
  // Auth
  ['post', '/auth'],
  ['post', '/register'],
  ['post', '/whoami'],
  ['post', '/goodbye'],
  // Tokens
  ['get', '/token/{tokenType}'],
  // Users
  ['get', '/user/{id}'],
  ['get', '/user/{id}/devices'],
  ['post', '/user/{id}/devices'],
  ['delete', '/user/{userID}/devices/{deviceID}'],
  ['get', '/user/{id}/permissions'],
  ['get', '/user/{id}/servers'],
  // Devices
  ['get', '/device/{id}'],
  ['post', '/device/{id}/keyBundle'],
  ['post', '/device/{id}/mail'],
  ['post', '/device/{id}/connect'],
  ['get', '/device/{id}/otk/count'],
  ['post', '/device/{id}/otk'],
  // Servers
  ['get', '/server/{id}'],
  ['post', '/server'],
  ['delete', '/server/{id}'],
  ['post', '/server/{id}/channels'],
  ['get', '/server/{id}/channels'],
  ['delete', '/channel/{id}'],
  ['get', '/server/{serverID}/permissions'],
  ['delete', '/permission/{id}'],
  ['get', '/server/{serverID}/invites'],
  ['post', '/server/{serverID}/invites'],
  // Files
  ['get', '/file/{id}'],
  ['post', '/file'],
  // Avatars
  ['get', '/avatar/{userID}'],
  ['post', '/avatar/{userID}'],
  // Emojis — POST is under /server/{serverID}/emoji to avoid ambiguous path collision
  ['get', '/emoji/{emojiID}'],
  ['post', '/server/{serverID}/emoji'],
  // User lists
  ['post', '/userList/{channelID}'],
] as const

describe('OpenAPI path coverage', () => {
  it.each(expectedPaths)('%s %s is present in the spec', (method, path) => {
    expect(doc.paths?.[path]?.[method]).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Schema completeness
// ---------------------------------------------------------------------------

describe('OpenAPI schema completeness', () => {
  it('all registered paths have at least one response defined', () => {
    const paths = Object.entries(doc.paths ?? {}) as [string, Record<string, unknown>][]
    for (const [path, methods] of paths) {
      for (const [method, operation] of Object.entries(methods)) {
        const op = operation as { responses?: unknown; operationId?: string }
        expect(op.responses, `${method.toUpperCase()} ${path} missing responses`).toBeDefined()
      }
    }
  })

  it('all registered paths have an operationId', () => {
    const paths = Object.entries(doc.paths ?? {}) as [string, Record<string, unknown>][]
    for (const [path, methods] of paths) {
      for (const [method, operation] of Object.entries(methods)) {
        const op = operation as { operationId?: string }
        expect(op.operationId, `${method.toUpperCase()} ${path} missing operationId`).toBeTypeOf('string')
      }
    }
  })
})
