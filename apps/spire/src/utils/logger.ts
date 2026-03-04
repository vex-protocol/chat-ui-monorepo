import pino from 'pino'

// pino-pretty runs in a worker thread and adds significant overhead.
// Only enable in development. Production: raw JSON to stdout, consumed
// by the log aggregator (Datadog, Loki, CloudWatch, etc.).
const isDev = process.env['NODE_ENV'] !== 'production'

const root = pino({
  level: process.env['LOG_LEVEL'] ?? 'info',

  // Redact sensitive fields from every log line.
  // Paths use ECMAScript dot/bracket notation. Wildcards match any key at
  // that depth — but are depth-sensitive: '*.password' only matches one
  // level of nesting. Never allow user input to define redacted paths.
  redact: {
    paths: [
      // HTTP headers
      'req.headers.authorization',
      'req.headers.cookie',
      'req.headers["x-api-key"]',
      'req.headers["x-auth-token"]',
      // Auth/credential fields one level deep
      '*.password',
      '*.passwordHash',
      '*.token',
      '*.accessToken',
      '*.refreshToken',
      '*.secret',
      '*.apiKey',
    ],
    censor: '[REDACTED]',
  },

  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, translateTime: 'HH:MM:ss' },
    },
  }),
})

/**
 * Returns a child logger with `service` bound as metadata on every log line.
 * All children share the root instance's destination, level, and redaction.
 *
 * Note: changing `root.level` at runtime does NOT automatically propagate to
 * already-created child loggers. If dynamic log level changes are needed, use
 * pino-arborsculpture or maintain a registry of children.
 */
export function createLogger(service: string): pino.Logger {
  return root.child({ service })
}

/**
 * The shared root logger — pass this to pino-http:
 *   pinoHttp({ logger: rootLogger })
 * pino-http will create a per-request child automatically (attached to req.log).
 */
export { root as rootLogger }
