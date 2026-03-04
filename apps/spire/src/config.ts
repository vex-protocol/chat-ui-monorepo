import { z } from 'zod'

export const ConfigSchema = z
  .object({
    DB_TYPE: z.enum(['sqlite', 'postgres']),
    DATABASE_URL: z.string().optional(),
    SQLITE_PATH: z.string().optional(),
    SPK: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    API_PORT: z.coerce.number().default(16777),
    LOG_LEVEL: z
      .enum(['trace', 'debug', 'info', 'warn', 'error'])
      .default('info'),
    NODE_ENV: z
      .enum(['development', 'production', 'test'])
      .default('development'),
  })
  .refine(data => data.DB_TYPE !== 'postgres' || !!data.DATABASE_URL, {
    message: 'DATABASE_URL is required when DB_TYPE=postgres',
    path: ['DATABASE_URL'],
  })

export type Config = z.infer<typeof ConfigSchema>

export function parseConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return ConfigSchema.parse(env)
}
