import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

process.env['NODE_ENV'] = 'test'
process.env['LOG_LEVEL'] = 'silent'
process.env['JWT_SECRET'] = 'test-secret-must-be-at-least-32-chars-x'

// extendZodWithOpenApi mutates the global Zod prototype (adds .openapi()).
// It must be called before any schema that uses .openapi() is evaluated.
// The production call lives in src/openapi.ts, but calling it here ensures
// test files that import Zod schemas with .openapi() metadata work correctly,
// even if they don't transitively import src/openapi.ts.
// Calling it multiple times is idempotent.
extendZodWithOpenApi(z)
