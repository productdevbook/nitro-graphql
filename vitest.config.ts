import { resolve } from 'pathe'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/vercube/**',
      '**/dist/**',
    ],
    testTimeout: 30000,
    globalSetup: ['./tests/global-setup.ts'],
    setupFiles: ['./tests/setup.ts'],
    // Retry flaky tests (E2E tests may have race conditions)
    retry: 2,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.d.ts',
        'src/**/index.ts', // Barrel/re-export files
        'src/types/**',
        'src/cli/**', // CLI tested manually
        'src/stubs/**', // Stub files
        'src/core/types/**', // Type definitions only
        'src/nitro/types.ts', // Type definitions only
        'src/nitro/routes/**', // Route handlers tested via integration
        'src/nitro/virtual/**', // Virtual module generators
        'src/nuxt.ts', // Nuxt-specific (needs Nuxt to test)
        'src/core/codegen/runtime.ts', // Runtime config generation
      ],
    },
  },
  resolve: {
    alias: {
      '~': resolve(__dirname, './src'),
      '@': resolve(__dirname, './src'),
      // Map nitro-graphql/* imports to source files (no build required)
      'nitro-graphql/config': resolve(__dirname, './src/config.ts'),
      'nitro-graphql/define': resolve(__dirname, './src/define.ts'),
      'nitro-graphql/pubsub': resolve(__dirname, './src/core/pubsub/index.ts'),
      'nitro-graphql/native': resolve(__dirname, './tests/mocks/native.ts'),
      // Force single graphql instance to avoid "Cannot use GraphQL* from another module" errors
      'graphql': resolve(__dirname, './node_modules/graphql'),
    },
  },
})
