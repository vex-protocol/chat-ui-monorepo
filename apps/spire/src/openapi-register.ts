/**
 * Side-effect import barrel — importing this module ensures all route files
 * have executed their registry.registerPath() calls before generateOpenAPIDocument()
 * is invoked.
 *
 * Import this in:
 *   - scripts/generate-openapi.ts (CLI spec generation)
 *   - src/__tests__/openapi.test.ts (spec shape tests)
 */

// openapi.ts must load first — it calls extendZodWithOpenApi(z)
export { generateOpenAPIDocument, registry } from '#openapi'

// Route files register their paths as a side effect on import
import './routes/auth.js'
import './routes/users.js'
import './routes/devices.js'
import './routes/servers.js'
import './routes/stubs.js'
