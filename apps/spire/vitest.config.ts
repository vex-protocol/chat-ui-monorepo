import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    setupFiles: ['./test/setup.ts'],
    alias: {
      '#db': new URL('./src/db', import.meta.url).pathname,
      '#auth': new URL('./src/auth', import.meta.url).pathname,
      '#devices': new URL('./src/devices', import.meta.url).pathname,
      '#errors': new URL('./src/errors.js', import.meta.url).pathname,
      '#test': new URL('./test', import.meta.url).pathname,
    },
  },
})
