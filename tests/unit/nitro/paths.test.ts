/**
 * Unit tests for nitro/paths module
 *
 * Tests path resolution and file generation configuration:
 * - replacePlaceholders: replaces path placeholders with actual values
 * - getDefaultPaths: generates default paths based on Nitro configuration
 * - shouldGenerateFile: determines if a file should be generated based on config hierarchy
 * - resolveFilePath: resolves final file path with placeholder support
 * - shouldGenerateSdk/getSdkConfig: SDK configuration helpers
 * - shouldGenerateTypes/getTypesConfig: Types configuration helpers
 */
import type { Nitro } from 'nitro/types'
import type { PathPlaceholders } from '../../../src/nitro/paths'
import { describe, expect, it } from 'vitest'
import {
  getDefaultPaths,
  getSdkConfig,
  getTypesConfig,
  replacePlaceholders,
  resolveFilePath,
  shouldGenerateFile,
  shouldGenerateSdk,
  shouldGenerateTypes,
} from '../../../src/nitro/paths'

/**
 * Helper to create a mock Nitro object with minimal required properties
 */
function createMockNitro(options: {
  rootDir?: string
  buildDir?: string
  framework?: { name: string }
  graphql?: Nitro['options']['graphql']
} = {}): Nitro {
  return {
    options: {
      rootDir: options.rootDir ?? '/project',
      buildDir: options.buildDir ?? '/project/.nitro',
      framework: options.framework,
      graphql: options.graphql,
    },
  } as unknown as Nitro
}

/**
 * Helper to create default placeholders for testing
 */
function createPlaceholders(overrides: Partial<PathPlaceholders> = {}): PathPlaceholders {
  return {
    serviceName: 'default',
    buildDir: '/project/.nitro',
    rootDir: '/project',
    framework: 'nitro',
    typesDir: '/project/.nitro/types',
    serverDir: '/project/server/graphql',
    clientDir: '/project/graphql',
    ...overrides,
  }
}

describe('replacePlaceholders', () => {
  describe('single placeholder replacement', () => {
    it('should replace {serviceName} placeholder', () => {
      const placeholders = createPlaceholders({ serviceName: 'github' })

      const result = replacePlaceholders('sdk/{serviceName}/client.ts', placeholders)

      expect(result).toBe('sdk/github/client.ts')
    })

    it('should replace {buildDir} placeholder', () => {
      const placeholders = createPlaceholders({ buildDir: '/custom/.build' })

      const result = replacePlaceholders('{buildDir}/types/server.d.ts', placeholders)

      expect(result).toBe('/custom/.build/types/server.d.ts')
    })

    it('should replace {rootDir} placeholder', () => {
      const placeholders = createPlaceholders({ rootDir: '/home/user/project' })

      const result = replacePlaceholders('{rootDir}/src/graphql', placeholders)

      expect(result).toBe('/home/user/project/src/graphql')
    })

    it('should replace {framework} placeholder', () => {
      const placeholders = createPlaceholders({ framework: 'nuxt' })

      const result = replacePlaceholders('types/{framework}-graphql.d.ts', placeholders)

      expect(result).toBe('types/nuxt-graphql.d.ts')
    })

    it('should replace {typesDir} placeholder', () => {
      const placeholders = createPlaceholders({ typesDir: '/project/types' })

      const result = replacePlaceholders('{typesDir}/graphql-server.d.ts', placeholders)

      expect(result).toBe('/project/types/graphql-server.d.ts')
    })

    it('should replace {serverDir} placeholder', () => {
      const placeholders = createPlaceholders({ serverDir: '/project/api/graphql' })

      const result = replacePlaceholders('{serverDir}/config.ts', placeholders)

      expect(result).toBe('/project/api/graphql/config.ts')
    })

    it('should replace {clientDir} placeholder', () => {
      const placeholders = createPlaceholders({ clientDir: '/project/app/graphql' })

      const result = replacePlaceholders('{clientDir}/queries.ts', placeholders)

      expect(result).toBe('/project/app/graphql/queries.ts')
    })
  })

  describe('multiple placeholder replacement', () => {
    it('should replace multiple different placeholders in one path', () => {
      const placeholders = createPlaceholders({
        buildDir: '/build',
        framework: 'nuxt',
        serviceName: 'api',
      })

      const result = replacePlaceholders('{buildDir}/{framework}/{serviceName}/types.d.ts', placeholders)

      expect(result).toBe('/build/nuxt/api/types.d.ts')
    })

    it('should replace all placeholders in complex path', () => {
      const placeholders = createPlaceholders({
        rootDir: '/home/project',
        buildDir: '/home/project/.nitro',
        typesDir: '/home/project/.nitro/types',
        clientDir: '/home/project/app/graphql',
        serverDir: '/home/project/server/graphql',
        serviceName: 'github',
        framework: 'nuxt',
      })

      const result = replacePlaceholders(
        '{rootDir}/generated/{framework}/{serviceName}.ts',
        placeholders,
      )

      expect(result).toBe('/home/project/generated/nuxt/github.ts')
    })
  })

  describe('repeated placeholder replacement', () => {
    it('should replace same placeholder multiple times', () => {
      const placeholders = createPlaceholders({ serviceName: 'myservice' })

      const result = replacePlaceholders('{serviceName}/{serviceName}/index.ts', placeholders)

      expect(result).toBe('myservice/myservice/index.ts')
    })

    it('should replace {buildDir} appearing multiple times', () => {
      const placeholders = createPlaceholders({ buildDir: '/dist' })

      const result = replacePlaceholders('{buildDir}/temp/{buildDir}/final', placeholders)

      expect(result).toBe('/dist/temp//dist/final')
    })
  })

  describe('default serviceName handling', () => {
    it('should use "default" when serviceName is undefined', () => {
      const placeholders = createPlaceholders({ serviceName: undefined })

      const result = replacePlaceholders('sdk/{serviceName}/client.ts', placeholders)

      expect(result).toBe('sdk/default/client.ts')
    })

    it('should use "default" when serviceName is empty string', () => {
      const placeholders = createPlaceholders({ serviceName: '' })

      const result = replacePlaceholders('sdk/{serviceName}/client.ts', placeholders)

      expect(result).toBe('sdk/default/client.ts')
    })
  })

  describe('edge cases', () => {
    it('should return path unchanged when no placeholders present', () => {
      const placeholders = createPlaceholders()

      const result = replacePlaceholders('/static/path/to/file.ts', placeholders)

      expect(result).toBe('/static/path/to/file.ts')
    })

    it('should handle empty path', () => {
      const placeholders = createPlaceholders()

      const result = replacePlaceholders('', placeholders)

      expect(result).toBe('')
    })

    it('should not replace partial placeholder matches', () => {
      const placeholders = createPlaceholders({ serviceName: 'test' })

      const result = replacePlaceholders('serviceName/file.ts', placeholders)

      expect(result).toBe('serviceName/file.ts')
    })

    it('should not replace unclosed placeholders', () => {
      const placeholders = createPlaceholders({ serviceName: 'test' })

      const result = replacePlaceholders('{serviceName/file.ts', placeholders)

      expect(result).toBe('{serviceName/file.ts')
    })

    it('should not replace unknown placeholders', () => {
      const placeholders = createPlaceholders()

      const result = replacePlaceholders('{unknownPlaceholder}/file.ts', placeholders)

      expect(result).toBe('{unknownPlaceholder}/file.ts')
    })
  })
})

describe('getDefaultPaths', () => {
  describe('framework detection', () => {
    it('should detect Nuxt framework', () => {
      const nitro = createMockNitro({ framework: { name: 'nuxt' } })

      const result = getDefaultPaths(nitro)

      expect(result.framework).toBe('nuxt')
    })

    it('should default to Nitro framework when framework is not nuxt', () => {
      const nitro = createMockNitro({ framework: { name: 'other' } })

      const result = getDefaultPaths(nitro)

      expect(result.framework).toBe('nitro')
    })

    it('should default to Nitro framework when framework is undefined', () => {
      const nitro = createMockNitro()

      const result = getDefaultPaths(nitro)

      expect(result.framework).toBe('nitro')
    })
  })

  describe('default directory paths', () => {
    it('should return correct rootDir', () => {
      const nitro = createMockNitro({ rootDir: '/custom/project' })

      const result = getDefaultPaths(nitro)

      expect(result.rootDir).toBe('/custom/project')
    })

    it('should return correct buildDir', () => {
      const nitro = createMockNitro({ buildDir: '/custom/.build' })

      const result = getDefaultPaths(nitro)

      expect(result.buildDir).toBe('/custom/.build')
    })

    it('should return default serverDir for Nitro', () => {
      const nitro = createMockNitro({ rootDir: '/project' })

      const result = getDefaultPaths(nitro)

      expect(result.serverDir).toBe('/project/server/graphql')
    })

    it('should return default clientDir for Nitro', () => {
      const nitro = createMockNitro({
        rootDir: '/project',
        framework: undefined,
      })

      const result = getDefaultPaths(nitro)

      expect(result.clientDir).toBe('/project/graphql')
    })

    it('should return default clientDir for Nuxt', () => {
      const nitro = createMockNitro({
        rootDir: '/project',
        framework: { name: 'nuxt' },
      })

      const result = getDefaultPaths(nitro)

      expect(result.clientDir).toBe('/project/app/graphql')
    })

    it('should return default typesDir', () => {
      const nitro = createMockNitro({ buildDir: '/project/.nitro' })

      const result = getDefaultPaths(nitro)

      expect(result.typesDir).toBe('/project/.nitro/types')
    })

    it('should return default serviceName', () => {
      const nitro = createMockNitro()

      const result = getDefaultPaths(nitro)

      expect(result.serviceName).toBe('default')
    })
  })

  describe('custom directory paths from graphql config', () => {
    it('should use custom serverDir from config', () => {
      const nitro = createMockNitro({
        rootDir: '/project',
        graphql: { serverDir: '/project/api/gql' },
      })

      const result = getDefaultPaths(nitro)

      expect(result.serverDir).toBe('/project/api/gql')
    })

    it('should use custom clientDir from config', () => {
      const nitro = createMockNitro({
        rootDir: '/project',
        graphql: { clientDir: '/project/src/graphql' },
      })

      const result = getDefaultPaths(nitro)

      expect(result.clientDir).toBe('/project/src/graphql')
    })

    it('should use custom typesDir from config', () => {
      const nitro = createMockNitro({
        rootDir: '/project',
        graphql: { typesDir: '/project/generated/types' },
      })

      const result = getDefaultPaths(nitro)

      expect(result.typesDir).toBe('/project/generated/types')
    })

    it('should use all custom directories from config', () => {
      const nitro = createMockNitro({
        rootDir: '/project',
        buildDir: '/project/.output',
        graphql: {
          serverDir: '/project/api/graphql',
          clientDir: '/project/web/graphql',
          typesDir: '/project/types',
        },
      })

      const result = getDefaultPaths(nitro)

      expect(result.serverDir).toBe('/project/api/graphql')
      expect(result.clientDir).toBe('/project/web/graphql')
      expect(result.typesDir).toBe('/project/types')
    })
  })

  describe('return type completeness', () => {
    it('should return all required placeholder properties', () => {
      const nitro = createMockNitro()

      const result = getDefaultPaths(nitro)

      expect(result).toHaveProperty('serviceName')
      expect(result).toHaveProperty('buildDir')
      expect(result).toHaveProperty('rootDir')
      expect(result).toHaveProperty('framework')
      expect(result).toHaveProperty('typesDir')
      expect(result).toHaveProperty('serverDir')
      expect(result).toHaveProperty('clientDir')
    })
  })
})

describe('shouldGenerateFile', () => {
  describe('specific file config priority', () => {
    it('should return false when config is explicitly false', () => {
      const result = shouldGenerateFile(false, true, true)

      expect(result).toBe(false)
    })

    it('should return true when config is explicitly true', () => {
      const result = shouldGenerateFile(true, false, false)

      expect(result).toBe(true)
    })

    it('should return true when config is a custom path string', () => {
      const result = shouldGenerateFile('/custom/path.ts', false, false)

      expect(result).toBe(true)
    })

    it('should return true when config is empty string (custom path)', () => {
      // Empty string is still a string, so it should generate
      const result = shouldGenerateFile('', false, false)

      expect(result).toBe(true)
    })
  })

  describe('category enabled priority', () => {
    it('should return false when category is disabled and no specific config', () => {
      const result = shouldGenerateFile(undefined, false, true)

      expect(result).toBe(false)
    })

    it('should return true when category is enabled and no specific config', () => {
      const result = shouldGenerateFile(undefined, true, false)

      expect(result).toBe(true)
    })
  })

  describe('top-level enabled fallback', () => {
    it('should return topLevelEnabled when both config and categoryEnabled are undefined', () => {
      expect(shouldGenerateFile(undefined, undefined, true)).toBe(true)
      expect(shouldGenerateFile(undefined, undefined, false)).toBe(false)
    })
  })

  describe('priority order verification', () => {
    it('should prioritize config=false over categoryEnabled=true', () => {
      const result = shouldGenerateFile(false, true, true)

      expect(result).toBe(false)
    })

    it('should prioritize config=true over categoryEnabled=false', () => {
      const result = shouldGenerateFile(true, false, false)

      expect(result).toBe(true)
    })

    it('should prioritize config string over categoryEnabled=false', () => {
      const result = shouldGenerateFile('/path.ts', false, false)

      expect(result).toBe(true)
    })

    it('should prioritize categoryEnabled=false over topLevelEnabled=true', () => {
      const result = shouldGenerateFile(undefined, false, true)

      expect(result).toBe(false)
    })

    it('should prioritize categoryEnabled=true over topLevelEnabled=false', () => {
      const result = shouldGenerateFile(undefined, true, false)

      expect(result).toBe(true)
    })
  })
})

describe('resolveFilePath', () => {
  const defaultPlaceholders = createPlaceholders()

  describe('file generation skip cases', () => {
    it('should return null when config is false', () => {
      const result = resolveFilePath(
        false,
        true,
        true,
        'default/path.ts',
        defaultPlaceholders,
      )

      expect(result).toBeNull()
    })

    it('should return null when categoryEnabled is false and no specific config', () => {
      const result = resolveFilePath(
        undefined,
        false,
        true,
        'default/path.ts',
        defaultPlaceholders,
      )

      expect(result).toBeNull()
    })

    it('should return null when all config levels disable generation', () => {
      const result = resolveFilePath(
        undefined,
        undefined,
        false,
        'default/path.ts',
        defaultPlaceholders,
      )

      expect(result).toBeNull()
    })
  })

  describe('custom path handling', () => {
    it('should use custom path when config is a string', () => {
      const result = resolveFilePath(
        'custom/location/file.ts',
        undefined,
        true,
        'default/path.ts',
        createPlaceholders({ rootDir: '/project' }),
      )

      expect(result).toBe('/project/custom/location/file.ts')
    })

    it('should use absolute custom path as-is', () => {
      const result = resolveFilePath(
        '/absolute/custom/path.ts',
        undefined,
        true,
        'default/path.ts',
        createPlaceholders({ rootDir: '/project' }),
      )

      expect(result).toBe('/absolute/custom/path.ts')
    })

    it('should replace placeholders in custom path', () => {
      const result = resolveFilePath(
        '{clientDir}/{serviceName}/sdk.ts',
        undefined,
        true,
        'default/path.ts',
        createPlaceholders({
          rootDir: '/project',
          clientDir: '/project/app/graphql',
          serviceName: 'github',
        }),
      )

      expect(result).toBe('/project/app/graphql/github/sdk.ts')
    })

    it('should resolve relative custom path against rootDir after placeholder replacement', () => {
      const result = resolveFilePath(
        'src/{framework}/generated.ts',
        undefined,
        true,
        'default/path.ts',
        createPlaceholders({ rootDir: '/home/project', framework: 'nuxt' }),
      )

      expect(result).toBe('/home/project/src/nuxt/generated.ts')
    })
  })

  describe('default path handling', () => {
    it('should use default path when config is true', () => {
      const result = resolveFilePath(
        true,
        undefined,
        true,
        'server/graphql/schema.ts',
        createPlaceholders({ rootDir: '/project' }),
      )

      expect(result).toBe('/project/server/graphql/schema.ts')
    })

    it('should use default path when config is undefined and categoryEnabled is true', () => {
      const result = resolveFilePath(
        undefined,
        true,
        false,
        'types/server.d.ts',
        createPlaceholders({ rootDir: '/project' }),
      )

      expect(result).toBe('/project/types/server.d.ts')
    })

    it('should replace placeholders in default path', () => {
      const result = resolveFilePath(
        undefined,
        undefined,
        true,
        '{typesDir}/nitro-graphql-server.d.ts',
        createPlaceholders({
          rootDir: '/project',
          typesDir: '/project/.nitro/types',
        }),
      )

      expect(result).toBe('/project/.nitro/types/nitro-graphql-server.d.ts')
    })
  })

  describe('complex scenarios', () => {
    it('should handle external service path with all placeholders', () => {
      const result = resolveFilePath(
        '{clientDir}/{serviceName}/sdk.ts',
        true,
        true,
        '{clientDir}/external/sdk.ts',
        createPlaceholders({
          rootDir: '/workspace/app',
          clientDir: '/workspace/app/app/graphql',
          serviceName: 'stripe',
        }),
      )

      expect(result).toBe('/workspace/app/app/graphql/stripe/sdk.ts')
    })

    it('should handle type file path with buildDir placeholder', () => {
      const result = resolveFilePath(
        undefined,
        true,
        true,
        '{buildDir}/types/nitro-graphql-{serviceName}.d.ts',
        createPlaceholders({
          rootDir: '/project',
          buildDir: '/project/.nuxt',
          serviceName: 'github',
        }),
      )

      expect(result).toBe('/project/.nuxt/types/nitro-graphql-github.d.ts')
    })
  })
})

describe('shouldGenerateSdk', () => {
  describe('disabled cases', () => {
    it('should return false when sdk config is false', () => {
      const nitro = createMockNitro({
        graphql: { sdk: false },
      })

      const result = shouldGenerateSdk(nitro)

      expect(result).toBe(false)
    })

    it('should return false when sdk.enabled is false', () => {
      const nitro = createMockNitro({
        graphql: { sdk: { enabled: false } },
      })

      const result = shouldGenerateSdk(nitro)

      expect(result).toBe(false)
    })
  })

  describe('enabled cases', () => {
    it('should return true when graphql config is undefined', () => {
      const nitro = createMockNitro()

      const result = shouldGenerateSdk(nitro)

      expect(result).toBe(true)
    })

    it('should return true when sdk config is undefined', () => {
      const nitro = createMockNitro({
        graphql: {},
      })

      const result = shouldGenerateSdk(nitro)

      expect(result).toBe(true)
    })

    it('should return true when sdk.enabled is true', () => {
      const nitro = createMockNitro({
        graphql: { sdk: { enabled: true } },
      })

      const result = shouldGenerateSdk(nitro)

      expect(result).toBe(true)
    })

    it('should return true when sdk.enabled is undefined but sdk object exists', () => {
      const nitro = createMockNitro({
        graphql: { sdk: { main: true } },
      })

      const result = shouldGenerateSdk(nitro)

      expect(result).toBe(true)
    })
  })
})

describe('getSdkConfig', () => {
  describe('disabled case', () => {
    it('should return { enabled: false } when sdk is false', () => {
      const nitro = createMockNitro({
        graphql: { sdk: false },
      })

      const result = getSdkConfig(nitro)

      expect(result).toEqual({ enabled: false })
    })
  })

  describe('config passthrough', () => {
    it('should return empty object when sdk config is undefined', () => {
      const nitro = createMockNitro()

      const result = getSdkConfig(nitro)

      expect(result).toEqual({})
    })

    it('should return empty object when graphql.sdk is undefined', () => {
      const nitro = createMockNitro({
        graphql: {},
      })

      const result = getSdkConfig(nitro)

      expect(result).toEqual({})
    })

    it('should return sdk config object when defined', () => {
      const sdkConfig = {
        enabled: true,
        main: '/custom/sdk.ts',
        external: true,
      }
      const nitro = createMockNitro({
        graphql: { sdk: sdkConfig },
      })

      const result = getSdkConfig(nitro)

      expect(result).toEqual(sdkConfig)
    })

    it('should return sdk config with only some properties', () => {
      const sdkConfig = { main: false }
      const nitro = createMockNitro({
        graphql: { sdk: sdkConfig },
      })

      const result = getSdkConfig(nitro)

      expect(result).toEqual(sdkConfig)
    })
  })
})

describe('shouldGenerateTypes', () => {
  describe('disabled cases', () => {
    it('should return false when types config is false', () => {
      const nitro = createMockNitro({
        graphql: { types: false },
      })

      const result = shouldGenerateTypes(nitro)

      expect(result).toBe(false)
    })

    it('should return false when types.enabled is false', () => {
      const nitro = createMockNitro({
        graphql: { types: { enabled: false } },
      })

      const result = shouldGenerateTypes(nitro)

      expect(result).toBe(false)
    })
  })

  describe('enabled cases', () => {
    it('should return true when graphql config is undefined', () => {
      const nitro = createMockNitro()

      const result = shouldGenerateTypes(nitro)

      expect(result).toBe(true)
    })

    it('should return true when types config is undefined', () => {
      const nitro = createMockNitro({
        graphql: {},
      })

      const result = shouldGenerateTypes(nitro)

      expect(result).toBe(true)
    })

    it('should return true when types.enabled is true', () => {
      const nitro = createMockNitro({
        graphql: { types: { enabled: true } },
      })

      const result = shouldGenerateTypes(nitro)

      expect(result).toBe(true)
    })

    it('should return true when types.enabled is undefined but types object exists', () => {
      const nitro = createMockNitro({
        graphql: { types: { server: true } },
      })

      const result = shouldGenerateTypes(nitro)

      expect(result).toBe(true)
    })
  })
})

describe('getTypesConfig', () => {
  describe('disabled case', () => {
    it('should return { enabled: false } when types is false', () => {
      const nitro = createMockNitro({
        graphql: { types: false },
      })

      const result = getTypesConfig(nitro)

      expect(result).toEqual({ enabled: false })
    })
  })

  describe('config passthrough', () => {
    it('should return empty object when types config is undefined', () => {
      const nitro = createMockNitro()

      const result = getTypesConfig(nitro)

      expect(result).toEqual({})
    })

    it('should return empty object when graphql.types is undefined', () => {
      const nitro = createMockNitro({
        graphql: {},
      })

      const result = getTypesConfig(nitro)

      expect(result).toEqual({})
    })

    it('should return types config object when defined', () => {
      const typesConfig = {
        enabled: true,
        server: '/custom/server.d.ts',
        client: true,
        external: false,
      }
      const nitro = createMockNitro({
        graphql: { types: typesConfig },
      })

      const result = getTypesConfig(nitro)

      expect(result).toEqual(typesConfig)
    })

    it('should return types config with only some properties', () => {
      const typesConfig = { server: false }
      const nitro = createMockNitro({
        graphql: { types: typesConfig },
      })

      const result = getTypesConfig(nitro)

      expect(result).toEqual(typesConfig)
    })

    it('should return types config with custom client path', () => {
      const typesConfig = {
        enabled: true,
        client: '{rootDir}/generated/client-types.d.ts',
      }
      const nitro = createMockNitro({
        graphql: { types: typesConfig },
      })

      const result = getTypesConfig(nitro)

      expect(result).toEqual(typesConfig)
      expect(result.client).toBe('{rootDir}/generated/client-types.d.ts')
    })

    it('should return types config with all custom paths', () => {
      const typesConfig = {
        enabled: true,
        server: '{typesDir}/custom-server.d.ts',
        client: '{typesDir}/custom-client.d.ts',
        external: '{typesDir}/custom-external-{serviceName}.d.ts',
      }
      const nitro = createMockNitro({
        graphql: { types: typesConfig },
      })

      const result = getTypesConfig(nitro)

      expect(result).toEqual(typesConfig)
    })

    it('should disable client types when set to false', () => {
      const typesConfig = {
        enabled: true,
        server: true,
        client: false,
      }
      const nitro = createMockNitro({
        graphql: { types: typesConfig },
      })

      const result = getTypesConfig(nitro)

      expect(result.client).toBe(false)
    })
  })
})

describe('integration scenarios', () => {
  describe('nuxt project with custom paths', () => {
    it('should resolve all paths correctly for Nuxt project', () => {
      const nitro = createMockNitro({
        rootDir: '/home/user/nuxt-app',
        buildDir: '/home/user/nuxt-app/.nuxt',
        framework: { name: 'nuxt' },
        graphql: {
          serverDir: '/home/user/nuxt-app/server/api/graphql',
          clientDir: '/home/user/nuxt-app/app/gql',
          types: {
            enabled: true,
            server: '{typesDir}/server-types.d.ts',
          },
          sdk: {
            enabled: true,
            main: '{clientDir}/sdk/main.ts',
          },
        },
      })

      const placeholders = getDefaultPaths(nitro)

      expect(placeholders.framework).toBe('nuxt')
      expect(placeholders.serverDir).toBe('/home/user/nuxt-app/server/api/graphql')
      expect(placeholders.clientDir).toBe('/home/user/nuxt-app/app/gql')

      // Test SDK path resolution
      const sdkPath = resolveFilePath(
        '{clientDir}/sdk/main.ts',
        true,
        true,
        '{clientDir}/default/sdk.ts',
        placeholders,
      )
      expect(sdkPath).toBe('/home/user/nuxt-app/app/gql/sdk/main.ts')

      // Test types path resolution
      const typesPath = resolveFilePath(
        '{typesDir}/server-types.d.ts',
        true,
        true,
        '{typesDir}/nitro-graphql-server.d.ts',
        placeholders,
      )
      expect(typesPath).toBe('/home/user/nuxt-app/.nuxt/types/server-types.d.ts')
    })
  })

  describe('nitro project with disabled features', () => {
    it('should correctly handle disabled SDK and enabled types', () => {
      const nitro = createMockNitro({
        rootDir: '/project',
        buildDir: '/project/.nitro',
        graphql: {
          sdk: false,
          types: { enabled: true, server: true, client: false },
        },
      })

      expect(shouldGenerateSdk(nitro)).toBe(false)
      expect(shouldGenerateTypes(nitro)).toBe(true)

      const typesConfig = getTypesConfig(nitro)
      expect(typesConfig).toEqual({ enabled: true, server: true, client: false })

      const sdkConfig = getSdkConfig(nitro)
      expect(sdkConfig).toEqual({ enabled: false })
    })
  })

  describe('external service path resolution', () => {
    it('should resolve external service paths with service name placeholder', () => {
      const placeholders = createPlaceholders({
        rootDir: '/project',
        clientDir: '/project/app/graphql',
        serviceName: 'github',
        buildDir: '/project/.nuxt',
        typesDir: '/project/.nuxt/types',
      })

      // SDK path
      const sdkPath = resolveFilePath(
        '{clientDir}/{serviceName}/sdk.ts',
        true,
        true,
        '{clientDir}/default/sdk.ts',
        placeholders,
      )
      expect(sdkPath).toBe('/project/app/graphql/github/sdk.ts')

      // Types path
      const typesPath = resolveFilePath(
        '{typesDir}/nitro-graphql-client-{serviceName}.d.ts',
        true,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )
      expect(typesPath).toBe('/project/.nuxt/types/nitro-graphql-client-github.d.ts')
    })
  })

  describe('client types custom path resolution', () => {
    it('should resolve custom client types path with {rootDir} placeholder', () => {
      const placeholders = createPlaceholders({
        rootDir: '/my-project',
        buildDir: '/my-project/.nitro',
        typesDir: '/my-project/.nitro/types',
      })

      const clientTypesPath = resolveFilePath(
        '{rootDir}/generated/client-types.d.ts',
        true,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      expect(clientTypesPath).toBe('/my-project/generated/client-types.d.ts')
    })

    it('should resolve custom client types path with {typesDir} placeholder', () => {
      const placeholders = createPlaceholders({
        rootDir: '/my-project',
        buildDir: '/my-project/.nuxt',
        typesDir: '/my-project/.nuxt/types',
      })

      const clientTypesPath = resolveFilePath(
        '{typesDir}/custom-client.d.ts',
        true,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      expect(clientTypesPath).toBe('/my-project/.nuxt/types/custom-client.d.ts')
    })

    it('should resolve custom client types path with {buildDir} placeholder', () => {
      const placeholders = createPlaceholders({
        rootDir: '/my-project',
        buildDir: '/my-project/.nitro',
        typesDir: '/my-project/.nitro/types',
      })

      const clientTypesPath = resolveFilePath(
        '{buildDir}/graphql/client.d.ts',
        true,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      expect(clientTypesPath).toBe('/my-project/.nitro/graphql/client.d.ts')
    })

    it('should return null when client types path is false', () => {
      const placeholders = createPlaceholders({
        rootDir: '/my-project',
        typesDir: '/my-project/.nitro/types',
      })

      const clientTypesPath = resolveFilePath(
        false,
        true,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      expect(clientTypesPath).toBeNull()
    })

    it('should return null when categoryEnabled is false and config is undefined', () => {
      const placeholders = createPlaceholders({
        rootDir: '/my-project',
        typesDir: '/my-project/.nitro/types',
      })

      const clientTypesPath = resolveFilePath(
        undefined, // config is undefined
        false, // categoryEnabled = false
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      expect(clientTypesPath).toBeNull()
    })

    it('should generate when config is string even if categoryEnabled is false', () => {
      const placeholders = createPlaceholders({
        rootDir: '/my-project',
        typesDir: '/my-project/.nitro/types',
      })

      // Config string takes priority over categoryEnabled=false
      const clientTypesPath = resolveFilePath(
        '{typesDir}/client.d.ts',
        false, // categoryEnabled = false
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      // Should still generate because config is a string (explicit path)
      expect(clientTypesPath).toBe('/my-project/.nitro/types/client.d.ts')
    })

    it('should use default path when custom path is true', () => {
      const placeholders = createPlaceholders({
        rootDir: '/my-project',
        typesDir: '/my-project/.nitro/types',
      })

      const clientTypesPath = resolveFilePath(
        true,
        true,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      expect(clientTypesPath).toBe('/my-project/.nitro/types/nitro-graphql-client.d.ts')
    })

    it('should resolve absolute path without placeholders', () => {
      const placeholders = createPlaceholders({
        rootDir: '/my-project',
        typesDir: '/my-project/.nitro/types',
      })

      const clientTypesPath = resolveFilePath(
        '/absolute/path/to/client.d.ts',
        true,
        true,
        '{typesDir}/nitro-graphql-client.d.ts',
        placeholders,
      )

      expect(clientTypesPath).toBe('/absolute/path/to/client.d.ts')
    })
  })
})
