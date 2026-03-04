import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

// Extend Zod once — this module is the single call site.
extendZodWithOpenApi(z)

export const registry = new OpenAPIRegistry()

export const bearerAuth = registry.registerComponent(
  'securitySchemes',
  'bearerAuth',
  {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateOpenAPIDocument(): any {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: '3.1.0',
    info: { title: 'vex-chat spire', version: '0.1.0' },
    servers: [
      {
        url: 'http://localhost:{port}',
        variables: { port: { default: '16777' } },
      },
    ],
  })
}
