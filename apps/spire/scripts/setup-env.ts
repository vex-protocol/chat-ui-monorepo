/**
 * setup-env.ts — one-time dev environment bootstrap
 *
 * Copies .env.example → .env and fills in auto-generated cryptographic secrets
 * so `pnpm dev` works immediately after cloning.
 *
 * Usage: pnpm --filter spire setup
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import nacl from 'tweetnacl'

const dir = dirname(fileURLToPath(import.meta.url))
const root = resolve(dir, '..')
const examplePath = resolve(root, '.env.example')
const envPath = resolve(root, '.env')

if (existsSync(envPath)) {
  console.log('.env already exists — skipping. Delete it to regenerate.')
  process.exit(0)
}

const spk = Buffer.from(nacl.sign.keyPair().secretKey).toString('hex')
const jwtSecret = randomBytes(32).toString('hex')

let content = readFileSync(examplePath, 'utf8')
content = content.replace(/^SPK=$/m, `SPK=${spk}`)
content = content.replace(/^JWT_SECRET=$/m, `JWT_SECRET=${jwtSecret}`)

writeFileSync(envPath, content)
console.log('✓ Created apps/spire/.env with generated SPK and JWT_SECRET')
console.log('  You can now run: pnpm dev')
