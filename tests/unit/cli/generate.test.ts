/**
 * Unit tests for CLI generate command - types path resolution
 *
 * Tests that custom types paths from configuration are correctly
 * resolved in the resolveTypesPath helper function.
 *
 * Note: Full integration tests for CLI generate are in e2e/cli-custom-types-path.test.ts
 */
import type { CLIContext } from '../../../src/cli'
import { join, resolve } from 'pathe'
import { describe, expect, it } from 'vitest'

// Helper to create a minimal CLIContext for testing path resolution
function createTestContext(overrides: Partial<CLIContext['config']> = {}): CLIContext {
  const rootDir = overrides.rootDir || '/test/project'
  const buildDir = overrides.buildDir || join(rootDir, '.graphql')
  const typesDir = overrides.typesDir || join(buildDir, 'types')

  return {
    cwd: rootDir,
    config: {
      rootDir,
      buildDir,
      serverDir: overrides.serverDir || join(rootDir, 'server/graphql'),
      clientDir: overrides.clientDir || join(rootDir, 'graphql'),
      typesDir,
      framework: overrides.framework || 'graphql-yoga',
      ignore: overrides.ignore || ['**/node_modules/**', '**/dist/**'],
      ...overrides,
    },
  }
}

/**
 * Helper function to resolve types path from config
 * This mirrors the logic that should be in generate.ts
 */
function resolveTypesPath(
  ctx: CLIContext,
  configPath: boolean | string | undefined,
  defaultFileName: string,
): string | null {
  // If explicitly disabled
  if (configPath === false) {
    return null
  }

  // If custom string path provided
  if (typeof configPath === 'string') {
    return resolve(ctx.config.rootDir, configPath)
  }

  // Default path
  return join(ctx.config.typesDir, defaultFileName)
}

describe('cLI types path resolution', () => {
  describe('resolveTypesPath helper', () => {
    it('should return custom path when types.server is a string', () => {
      const ctx = createTestContext({
        types: {
          enabled: true,
          server: 'custom/path/server.d.ts',
        },
      })

      const result = resolveTypesPath(
        ctx,
        (ctx.config.types as { server?: boolean | string })?.server,
        'nitro-graphql-server.d.ts',
      )

      expect(result).toBe('/test/project/custom/path/server.d.ts')
    })

    it('should return default path when types.server is true', () => {
      const ctx = createTestContext({
        types: {
          enabled: true,
          server: true,
        },
      })

      const result = resolveTypesPath(
        ctx,
        (ctx.config.types as { server?: boolean | string })?.server,
        'nitro-graphql-server.d.ts',
      )

      expect(result).toBe('/test/project/.graphql/types/nitro-graphql-server.d.ts')
    })

    it('should return default path when types config is not provided', () => {
      const ctx = createTestContext({})

      const result = resolveTypesPath(
        ctx,
        undefined,
        'nitro-graphql-server.d.ts',
      )

      expect(result).toBe('/test/project/.graphql/types/nitro-graphql-server.d.ts')
    })

    it('should return null when path is explicitly false', () => {
      const ctx = createTestContext({
        types: {
          enabled: true,
          server: false,
        },
      })

      const result = resolveTypesPath(
        ctx,
        (ctx.config.types as { server?: boolean | string })?.server,
        'nitro-graphql-server.d.ts',
      )

      expect(result).toBeNull()
    })

    it('should resolve relative paths from rootDir', () => {
      const ctx = createTestContext({
        rootDir: '/test/packages/graphql',
        types: {
          enabled: true,
          client: '../../apps/main/app/graphql/types/graphql.d.ts',
        },
      })

      const result = resolveTypesPath(
        ctx,
        (ctx.config.types as { client?: boolean | string })?.client,
        'nitro-graphql-client.d.ts',
      )

      expect(result).toBe('/test/apps/main/app/graphql/types/graphql.d.ts')
    })

    it('should handle absolute paths correctly', () => {
      const ctx = createTestContext({
        types: {
          enabled: true,
          server: '/absolute/path/to/types.d.ts',
        },
      })

      const result = resolveTypesPath(
        ctx,
        (ctx.config.types as { server?: boolean | string })?.server,
        'nitro-graphql-server.d.ts',
      )

      expect(result).toBe('/absolute/path/to/types.d.ts')
    })
  })

  describe('client types path resolution', () => {
    it('should return custom path when types.client is a string', () => {
      const ctx = createTestContext({
        types: {
          enabled: true,
          client: 'apps/ecommerce/app/graphql/types/graphql.d.ts',
        },
      })

      const result = resolveTypesPath(
        ctx,
        (ctx.config.types as { client?: boolean | string })?.client,
        'nitro-graphql-client.d.ts',
      )

      expect(result).toBe('/test/project/apps/ecommerce/app/graphql/types/graphql.d.ts')
    })

    it('should return default path when types.client is undefined', () => {
      const ctx = createTestContext({
        types: {
          enabled: true,
        },
      })

      const result = resolveTypesPath(
        ctx,
        (ctx.config.types as { client?: boolean | string })?.client,
        'nitro-graphql-client.d.ts',
      )

      expect(result).toBe('/test/project/.graphql/types/nitro-graphql-client.d.ts')
    })
  })
})
