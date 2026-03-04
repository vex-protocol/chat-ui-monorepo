/**
 * Generates openapi.json at the project root.
 * Run: pnpm generate:openapi
 *
 * Import all route files here so their registry.registerPath() calls
 * execute before generateOpenAPIDocument() is called.
 */
import { writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateOpenAPIDocument } from '../src/openapi.ts'

const doc = generateOpenAPIDocument()
const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'openapi.json')
writeFileSync(outPath, JSON.stringify(doc, null, 2) + '\n')
console.log(`Written: ${outPath}`)
