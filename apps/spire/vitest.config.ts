import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    setupFiles: ['./test/setup.ts'],
    alias: {
      '#test': new URL('./test', import.meta.url).pathname,
    },
  },
})
