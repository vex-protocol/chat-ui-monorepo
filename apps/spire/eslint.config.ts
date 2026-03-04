import boundaries from 'eslint-plugin-boundaries'
import importX from 'eslint-plugin-import-x'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  {
    files: ['src/**/*.ts'],
    plugins: {
      boundaries,
      'import-x': importX,
      '@typescript-eslint': tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      'boundaries/elements': [
        // Fine-grained auth sub-files (jwt, crypto, token-store are not routes/service/schemas)
        { type: 'auth-internal', pattern: 'src/auth/auth.{jwt,crypto,token-store}.ts' },
        { type: 'routes',        pattern: 'src/**/*.routes.ts' },
        { type: 'service',       pattern: 'src/**/*.service.ts' },
        { type: 'schemas',       pattern: 'src/**/*.schemas.ts' },
        { type: 'middleware',    pattern: 'src/middleware/**/*.ts' },
        { type: 'db',            pattern: 'src/db/**/*.ts' },
        { type: 'utils',         pattern: 'src/utils/**/*.ts' },
        { type: 'ws',            pattern: 'src/ws/**/*.ts' },
        { type: 'config',        pattern: 'src/config.ts' },
        { type: 'errors',        pattern: 'src/errors.ts' },
        { type: 'openapi',       pattern: 'src/openapi.ts' },
        // app.ts, run.ts, index.ts, express.d.ts — top-level orchestrators
        { type: 'root',          pattern: 'src/*.ts' },
      ],
      'import-x/resolver': {
        typescript: {
          project: './tsconfig.json',
        },
      },
    },
    rules: {
      'boundaries/element-types': ['error', {
        default: 'disallow',
        rules: [
          // Routes: import services, middleware, schemas, errors, openapi, db (types), auth-internal
          // Also allow cross-service imports (e.g. servers.routes.ts → permissions.service.ts)
          {
            from: 'routes',
            allow: ['service', 'schemas', 'middleware', 'errors', 'openapi', 'db', 'auth-internal'],
          },
          // Services: import db, utils, errors, schemas, config, auth-internal
          {
            from: 'service',
            allow: ['db', 'utils', 'errors', 'schemas', 'config', 'auth-internal'],
          },
          // Schemas: pure Zod definitions — only import errors and utils
          {
            from: 'schemas',
            allow: ['errors', 'utils'],
          },
          // Middleware: import auth-internal (for JWT verify), errors, utils, config, schemas
          {
            from: 'middleware',
            allow: ['auth-internal', 'errors', 'utils', 'config', 'schemas'],
          },
          // DB: only config and errors
          {
            from: 'db',
            allow: ['config', 'errors'],
          },
          // Utils: only config and errors
          {
            from: 'utils',
            allow: ['config', 'errors'],
          },
          // WS service: imports db (types) and own schemas
          {
            from: 'ws',
            allow: ['db', 'schemas', 'errors', 'utils', 'config'],
          },
          // Auth-internal: jwt and crypto only need schemas/errors/utils
          {
            from: 'auth-internal',
            allow: ['schemas', 'errors', 'utils'],
          },
          // OpenAPI: only imports from zod/external — no internal cross-boundary imports needed
          {
            from: 'openapi',
            allow: ['*'],
          },
          // Root files (app.ts, run.ts, index.ts) orchestrate everything — allow all
          {
            from: 'root',
            allow: ['*'],
          },
        ],
      }],
      'import-x/no-cycle': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
    },
  },
]
