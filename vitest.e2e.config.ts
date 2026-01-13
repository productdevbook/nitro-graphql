import { resolve } from 'pathe'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/e2e/**/*.test.ts'],
    testTimeout: 60000,
    // E2E tests run sequentially - Nitro/filesystem resource contention
    fileParallelism: false,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '@': resolve(__dirname, './src'),
      'nitro-graphql/config': resolve(__dirname, './src/config.ts'),
      'nitro-graphql/define': resolve(__dirname, './src/define.ts'),
      'nitro-graphql/pubsub': resolve(__dirname, './src/core/pubsub/index.ts'),
      'nitro-graphql/native': resolve(__dirname, './tests/mocks/native.ts'),
      'graphql': resolve(__dirname, './node_modules/graphql'),
    },
  },
})
