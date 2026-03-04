import { z } from 'zod'

export const ConfigSchema = z.object({
  DB_TYPE: z.enum(['sqlite', 'postgres']),
  DATABASE_URL: z.string().optional(),
  SPK: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  API_PORT: z.coerce.number().default(3000),
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal', 'silent'])
    .default('info'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
}).refine(
  data => data.DB_TYPE !== 'postgres' || !!data.DATABASE_URL,
  { message: 'DATABASE_URL is required when DB_TYPE=postgres', path: ['DATABASE_URL'] },
)

export type Config = z.infer<typeof ConfigSchema>

export function parseConfig(_env: NodeJS.ProcessEnv = process.env): Config {
  throw new Error('not implemented')
}
