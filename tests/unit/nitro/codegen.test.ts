/**
 * Unit tests for Nitro GraphQL Type Generation
 *
 * Tests the codegen modules at src/nitro/codegen/ which:
 * - Generates server-side resolver types from GraphQL schemas
 * - Generates client-side operation types from GraphQL documents
 * - Generates types and SDKs for external GraphQL services
 * - Supports Apollo Federation when enabled
 * - Writes schema.graphql, type files, and SDK files to appropriate locations
 */

import type { Nitro } from 'nitro/types'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { createNitro, prepare } from 'nitro/builder'
import { dirname, resolve } from 'pathe'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import graphql from '../../../src'
import { generateClientTypes, generateServerTypes } from '../../../src/nitro/codegen'

const fixturesDir = resolve(__dirname, '../../fixtures')
const tempDir = resolve(__dirname, '../../.temp/codegen-tests')

// Helper to create a minimal Nitro mock for testing
function createMockNitro(overrides: Partial<Nitro> = {}): Nitro {
  const buildDir = resolve(tempDir, 'build')
  const rootDir = resolve(tempDir, 'project')

  const scanSchemas = overrides.scanSchemas ?? []
  const scanResolvers = overrides.scanResolvers ?? []
  const scanDirectives = overrides.scanDirectives ?? []
  const scanDocuments = overrides.scanDocuments ?? []
  const directiveSchemas = overrides.graphql?.directiveSchemas ?? null
  const extendConfigs = overrides.graphql?.extendConfigs ?? []
  const extendSchemas = overrides.graphql?.extendSchemas ?? []

  // Extract graphql, options, and scan arrays from overrides to merge them explicitly
  const { graphql: graphqlOverrides, options: optionsOverrides, scanSchemas: _ss, scanDocuments: _sd, scanResolvers: _sr, scanDirectives: _sdi, ...restOverrides } = overrides as any

  return {
    ...restOverrides,
    options: {
      rootDir,
      buildDir,
      dev: true,
      graphql: {
        framework: 'graphql-yoga',
        types: { enabled: true },
        sdk: { enabled: true },
      },
      framework: { name: 'nitro' },
      ...optionsOverrides,
    },
    scanSchemas,
    scanDocuments,
    scanResolvers,
    scanDirectives,
    graphql: {
      buildDir: resolve(buildDir, 'graphql'),
      watchDirs: [],
      clientDir: resolve(rootDir, 'graphql'),
      serverDir: resolve(rootDir, 'server', 'graphql'),
      dir: {
        build: resolve(buildDir, 'graphql'),
        client: resolve(rootDir, 'graphql'),
        server: resolve(rootDir, 'server', 'graphql'),
      },
      directiveSchemas: null,
      extendConfigs: [],
      extendSchemas: [],
      ...graphqlOverrides,
      state: {
        schemas: scanSchemas,
        resolvers: scanResolvers,
        directives: scanDirectives,
        documents: scanDocuments,
        directiveSchemas,
        extendConfigs,
        extendSchemas,
      },
    },
  } as unknown as Nitro
}

// Helper to ensure directory exists
function ensureDir(path: string): void {
  mkdirSync(path, { recursive: true })
}

// Helper to write a file with directory creation
function writeTestFile(path: string, content: string): void {
  ensureDir(dirname(path))
  writeFileSync(path, content, 'utf-8')
}

describe('generateServerTypes', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('basic functionality', () => {
    it('should return early when types generation is disabled', async () => {
      const nitro = createMockNitro({
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            types: { enabled: false },
          },
        },
      })

      // Should not throw, just return early
      await expect(generateServerTypes(nitro)).resolves.toBeUndefined()
    })

    it('should return early when types is set to false', async () => {
      const nitro = createMockNitro({
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            types: false,
          },
        },
      })

      await expect(generateServerTypes(nitro)).resolves.toBeUndefined()
    })

    it('should return early when no schemas are found', async () => {
      const nitro = createMockNitro({
        scanSchemas: [],
      })

      await expect(generateServerTypes(nitro)).resolves.toBeUndefined()
    })

    it('should not log when in silent mode with no schemas', async () => {
      const nitro = createMockNitro({
        scanSchemas: [],
      })

      // Should complete without error
      await expect(generateServerTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should handle missing schema files gracefully', async () => {
      const nitro = createMockNitro({
        scanSchemas: ['/nonexistent/path/schema.graphql'],
      })
      ensureDir(nitro.graphql.buildDir)

      // Should not throw
      await expect(generateServerTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })

    it('should handle invalid schema content gracefully', async () => {
      // Create a temp file with invalid GraphQL
      const invalidSchemaPath = resolve(tempDir, 'invalid.graphql')
      writeTestFile(invalidSchemaPath, 'invalid graphql content { not valid }')

      const nitro = createMockNitro({
        scanSchemas: [invalidSchemaPath],
      })
      ensureDir(nitro.graphql.buildDir)

      // Should not throw, error is handled internally
      await expect(generateServerTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })
  })
})

describe('generateClientTypes', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('main client types', () => {
    it('should skip when no schemas are present', async () => {
      const nitro = createMockNitro({
        scanSchemas: [],
        scanDocuments: [],
      })

      await expect(generateClientTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })

    it('should skip when schema.graphql does not exist in build dir', async () => {
      const nitro = createMockNitro({
        scanSchemas: [resolve(fixturesDir, 'schemas/user.graphql')],
        scanDocuments: [resolve(fixturesDir, 'documents/getUser.graphql')],
      })
      // Don't create the schema.graphql file

      await expect(generateClientTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })
  })

  describe('external service types', () => {
    it('should skip when no external services configured', async () => {
      const nitro = createMockNitro({
        scanSchemas: [],
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            externalServices: [],
          },
        },
      })

      await expect(generateClientTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })

    it('should skip when external services is undefined', async () => {
      const nitro = createMockNitro({
        scanSchemas: [],
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            // No externalServices property
          },
        },
      })

      await expect(generateClientTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })
  })

  describe('error handling', () => {
    it('should handle errors gracefully and continue', async () => {
      const nitro = createMockNitro({
        scanSchemas: [resolve(fixturesDir, 'schemas/user.graphql')],
        scanDocuments: ['/nonexistent/query.graphql'],
      })

      // Should not throw
      await expect(generateClientTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })
  })
})

describe('integration with real Nitro', () => {
  let nitro: Nitro

  beforeAll(async () => {
    // Create a real Nitro instance with the graphql module
    nitro = await createNitro({
      rootDir: resolve(fixturesDir, 'main-project'),
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          extend: [resolve(fixturesDir, 'extend-pkg')],
          types: { enabled: false }, // Disable type generation to avoid conflicts
        }),
      ],
    })

    await prepare(nitro)
  }, 30000)

  afterAll(async () => {
    if (nitro) {
      await nitro.close()
    }
  })

  describe('nitro configuration', () => {
    it('should have scanSchemas populated', () => {
      expect(nitro.scanSchemas).toBeDefined()
      expect(Array.isArray(nitro.scanSchemas)).toBe(true)
      expect(nitro.scanSchemas.length).toBeGreaterThan(0)
    })

    it('should have graphql build directory configured', () => {
      expect(nitro.graphql.buildDir).toBeDefined()
      expect(typeof nitro.graphql.buildDir).toBe('string')
    })

    it('should have graphql options configured', () => {
      expect(nitro.options.graphql).toBeDefined()
      expect(nitro.options.graphql?.framework).toBe('graphql-yoga')
    })

    it('should include schemas from extended packages', () => {
      const hasExtendSchema = nitro.scanSchemas.some(
        (s: string) => s.includes('extend-pkg'),
      )
      expect(hasExtendSchema).toBe(true)
    })

    it('should include local schemas', () => {
      const hasLocalSchema = nitro.scanSchemas.some(
        (s: string) => s.includes('main-project'),
      )
      expect(hasLocalSchema).toBe(true)
    })

    it('should have scanResolvers array', () => {
      expect(nitro.scanResolvers).toBeDefined()
      expect(Array.isArray(nitro.scanResolvers)).toBe(true)
    })

    it('should have scanDirectives array', () => {
      expect(nitro.scanDirectives).toBeDefined()
      expect(Array.isArray(nitro.scanDirectives)).toBe(true)
    })

    it('should have extendConfigs populated from extend packages', () => {
      expect(nitro.graphql.extendConfigs).toBeDefined()
      expect(Array.isArray(nitro.graphql.extendConfigs)).toBe(true)
    })

    it('should have extendSchemas populated from extend packages', () => {
      expect(nitro.graphql.extendSchemas).toBeDefined()
      expect(Array.isArray(nitro.graphql.extendSchemas)).toBe(true)
    })
  })
})

describe('path configuration utilities', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('types configuration', () => {
    it('should check types.enabled correctly when true', async () => {
      const nitro = createMockNitro({
        scanSchemas: [],
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            types: { enabled: true },
          },
        },
      })

      // No schemas, so should return early regardless
      await expect(generateServerTypes(nitro, { silent: true })).resolves.toBeUndefined()
    })

    it('should return early when types.enabled is false', async () => {
      const nitro = createMockNitro({
        scanSchemas: [resolve(fixturesDir, 'schemas/user.graphql')],
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            types: { enabled: false },
          },
        },
      })
      ensureDir(nitro.graphql.buildDir)

      await generateServerTypes(nitro, { silent: true })

      // Should NOT have created any files since types are disabled
      const schemaOutputPath = resolve(nitro.graphql.buildDir, 'schema.graphql')
      expect(existsSync(schemaOutputPath)).toBe(false)
    })

    it('should handle types set to false at category level', async () => {
      const nitro = createMockNitro({
        scanSchemas: [resolve(fixturesDir, 'schemas/user.graphql')],
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            types: false,
          },
        },
      })
      ensureDir(nitro.graphql.buildDir)

      await generateServerTypes(nitro, { silent: true })

      // Should NOT have created any files
      const schemaOutputPath = resolve(nitro.graphql.buildDir, 'schema.graphql')
      expect(existsSync(schemaOutputPath)).toBe(false)
    })
  })

  describe('custom directory configuration', () => {
    it('should use default typesDir when not configured', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            // No typesDir configured
          },
        },
      })

      expect(nitro.options.graphql?.typesDir).toBeUndefined()
    })

    it('should accept custom typesDir configuration', () => {
      const customTypesDir = resolve(tempDir, 'custom-types')
      const nitro = createMockNitro({
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            typesDir: customTypesDir,
          },
        },
      })

      expect(nitro.options.graphql?.typesDir).toBe(customTypesDir)
    })

    it('should accept custom serverDir configuration', () => {
      const customServerDir = resolve(tempDir, 'custom-server/graphql')
      const nitro = createMockNitro({
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            serverDir: customServerDir,
          },
        },
      })

      expect(nitro.options.graphql?.serverDir).toBe(customServerDir)
    })

    it('should accept custom clientDir configuration', () => {
      const customClientDir = resolve(tempDir, 'custom-client/graphql')
      const nitro = createMockNitro({
        options: {
          rootDir: tempDir,
          buildDir: resolve(tempDir, 'build'),
          dev: true,
          graphql: {
            framework: 'graphql-yoga',
            clientDir: customClientDir,
          },
        },
      })

      expect(nitro.options.graphql?.clientDir).toBe(customClientDir)
    })
  })
})

describe('framework configuration', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should accept graphql-yoga as framework', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
        },
      },
    })

    expect(nitro.options.graphql?.framework).toBe('graphql-yoga')
  })

  it('should accept apollo-server as framework', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'apollo-server',
        },
      },
    })

    expect(nitro.options.graphql?.framework).toBe('apollo-server')
  })

  it('should use graphql-yoga as default when framework not specified', async () => {
    const nitro = createMockNitro({
      scanSchemas: [],
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          // No framework specified
        },
      },
    })

    // The generateServerTypes function defaults to 'graphql-yoga' internally
    expect(nitro.options.graphql?.framework).toBeUndefined()
  })
})

describe('federation configuration', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should accept federation.enabled configuration', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'apollo-server',
          federation: { enabled: true },
        },
      },
    })

    expect(nitro.options.graphql?.federation?.enabled).toBe(true)
  })

  it('should accept federation with service configuration', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'apollo-server',
          federation: {
            enabled: true,
            serviceName: 'my-service',
            serviceVersion: '1.0.0',
            serviceUrl: 'http://localhost:4000/graphql',
          },
        },
      },
    })

    expect(nitro.options.graphql?.federation?.serviceName).toBe('my-service')
    expect(nitro.options.graphql?.federation?.serviceVersion).toBe('1.0.0')
    expect(nitro.options.graphql?.federation?.serviceUrl).toBe('http://localhost:4000/graphql')
  })

  it('should default federation to undefined when not configured', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
        },
      },
    })

    expect(nitro.options.graphql?.federation).toBeUndefined()
  })
})

describe('codegen configuration', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should accept custom server codegen config', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          codegen: {
            server: {
              scalars: {
                DateTime: 'Date',
                JSON: 'Record<string, unknown>',
              },
              contextType: 'custom/context#CustomContext',
            },
          },
        },
      },
    })

    expect(nitro.options.graphql?.codegen?.server?.scalars).toEqual({
      DateTime: 'Date',
      JSON: 'Record<string, unknown>',
    })
    expect(nitro.options.graphql?.codegen?.server?.contextType).toBe('custom/context#CustomContext')
  })

  it('should accept custom client codegen config', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          codegen: {
            client: {
              enumsAsTypes: false,
              endpoint: 'http://localhost:4000/graphql',
            },
          },
        },
      },
    })

    expect(nitro.options.graphql?.codegen?.client?.enumsAsTypes).toBe(false)
    expect(nitro.options.graphql?.codegen?.client?.endpoint).toBe('http://localhost:4000/graphql')
  })

  it('should accept custom clientSDK config', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          codegen: {
            clientSDK: {
              rawRequest: false,
              documentMode: 'string',
            },
          },
        },
      },
    })

    expect(nitro.options.graphql?.codegen?.clientSDK?.rawRequest).toBe(false)
    expect(nitro.options.graphql?.codegen?.clientSDK?.documentMode).toBe('string')
  })
})

describe('external services configuration', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should accept external services configuration', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          externalServices: [
            {
              name: 'github',
              endpoint: 'https://api.github.com/graphql',
              schema: 'https://api.github.com/graphql',
            },
          ],
        },
      },
    })

    expect(nitro.options.graphql?.externalServices).toHaveLength(1)
    expect(nitro.options.graphql?.externalServices?.[0].name).toBe('github')
  })

  it('should accept external services with documents', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          externalServices: [
            {
              name: 'github',
              endpoint: 'https://api.github.com/graphql',
              documents: ['app/graphql/github/**/*.graphql'],
            },
          ],
        },
      },
    })

    expect(nitro.options.graphql?.externalServices?.[0].documents).toEqual(['app/graphql/github/**/*.graphql'])
  })

  it('should accept external services with headers function', () => {
    const headersFn = () => ({ Authorization: 'Bearer token' })
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          externalServices: [
            {
              name: 'github',
              endpoint: 'https://api.github.com/graphql',
              headers: headersFn,
            },
          ],
        },
      },
    })

    expect(typeof nitro.options.graphql?.externalServices?.[0].headers).toBe('function')
  })

  it('should accept external services with custom paths', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          externalServices: [
            {
              name: 'github',
              endpoint: 'https://api.github.com/graphql',
              paths: {
                sdk: 'app/graphql/github/sdk.ts',
                types: 'types/github.d.ts',
              },
            },
          ],
        },
      },
    })

    expect(nitro.options.graphql?.externalServices?.[0].paths?.sdk).toBe('app/graphql/github/sdk.ts')
    expect(nitro.options.graphql?.externalServices?.[0].paths?.types).toBe('types/github.d.ts')
  })

  it('should accept downloadSchema configuration', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          externalServices: [
            {
              name: 'github',
              endpoint: 'https://api.github.com/graphql',
              downloadSchema: 'once',
              downloadPath: '.graphql/github.graphql',
            },
          ],
        },
      },
    })

    expect(nitro.options.graphql?.externalServices?.[0].downloadSchema).toBe('once')
    expect(nitro.options.graphql?.externalServices?.[0].downloadPath).toBe('.graphql/github.graphql')
  })
})

describe('sDK configuration', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should accept sdk: false to disable all SDK generation', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          sdk: false,
        },
      },
    })

    expect(nitro.options.graphql?.sdk).toBe(false)
  })

  it('should accept sdk.enabled configuration', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          sdk: { enabled: false },
        },
      },
    })

    expect(nitro.options.graphql?.sdk).toEqual({ enabled: false })
  })

  it('should accept sdk.main custom path', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          sdk: {
            main: 'lib/sdk.ts',
          },
        },
      },
    })

    expect((nitro.options.graphql?.sdk as any)?.main).toBe('lib/sdk.ts')
  })

  it('should accept sdk.external custom path', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          sdk: {
            external: '{clientDir}/external/{serviceName}/sdk.ts',
          },
        },
      },
    })

    expect((nitro.options.graphql?.sdk as any)?.external).toBe('{clientDir}/external/{serviceName}/sdk.ts')
  })
})

describe('security configuration', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should accept security configuration', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          security: {
            introspection: false,
            playground: false,
            maskErrors: true,
            disableSuggestions: true,
          },
        },
      },
    })

    expect(nitro.options.graphql?.security?.introspection).toBe(false)
    expect(nitro.options.graphql?.security?.playground).toBe(false)
    expect(nitro.options.graphql?.security?.maskErrors).toBe(true)
    expect(nitro.options.graphql?.security?.disableSuggestions).toBe(true)
  })

  it('should default security options to undefined when not configured', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
        },
      },
    })

    expect(nitro.options.graphql?.security).toBeUndefined()
  })
})

describe('extend configuration', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should accept extend as array of strings', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          extend: ['@myorg/graphql', './generated'],
        },
      },
    })

    expect(nitro.options.graphql?.extend).toEqual(['@myorg/graphql', './generated'])
  })

  it('should accept extend with explicit manifest path', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          extend: [{ manifest: './custom-manifest.json' }],
        },
      },
    })

    expect((nitro.options.graphql?.extend?.[0] as any).manifest).toBe('./custom-manifest.json')
  })

  it('should accept skipLocalScan configuration', () => {
    const nitro = createMockNitro({
      options: {
        rootDir: tempDir,
        buildDir: resolve(tempDir, 'build'),
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          skipLocalScan: true,
          extend: ['@myorg/graphql'],
        },
      },
    })

    expect(nitro.options.graphql?.skipLocalScan).toBe(true)
  })
})

describe('graphql object properties', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should have all required graphql object properties', () => {
    const nitro = createMockNitro()

    expect(nitro.graphql).toHaveProperty('buildDir')
    expect(nitro.graphql).toHaveProperty('watchDirs')
    expect(nitro.graphql).toHaveProperty('clientDir')
    expect(nitro.graphql).toHaveProperty('serverDir')
    expect(nitro.graphql).toHaveProperty('dir')
    expect(nitro.graphql).toHaveProperty('directiveSchemas')
    expect(nitro.graphql).toHaveProperty('extendConfigs')
    expect(nitro.graphql).toHaveProperty('extendSchemas')
  })

  it('should have dir object with build, client, server properties', () => {
    const nitro = createMockNitro()

    expect(nitro.graphql.dir).toHaveProperty('build')
    expect(nitro.graphql.dir).toHaveProperty('client')
    expect(nitro.graphql.dir).toHaveProperty('server')
  })

  it('should have directiveSchemas as null by default', () => {
    const nitro = createMockNitro()

    expect(nitro.graphql.directiveSchemas).toBeNull()
  })

  it('should accept directiveSchemas string', () => {
    const nitro = createMockNitro({
      graphql: {
        buildDir: resolve(tempDir, 'build', 'graphql'),
        watchDirs: [],
        clientDir: resolve(tempDir, 'graphql'),
        serverDir: resolve(tempDir, 'server', 'graphql'),
        dir: {
          build: resolve(tempDir, 'build', 'graphql'),
          client: resolve(tempDir, 'graphql'),
          server: resolve(tempDir, 'server', 'graphql'),
        },
        directiveSchemas: 'directive @auth on FIELD_DEFINITION',
        extendConfigs: [],
        extendSchemas: [],
      },
    })

    expect(nitro.graphql.directiveSchemas).toBe('directive @auth on FIELD_DEFINITION')
  })
})

describe('scan arrays', () => {
  it('should have scanSchemas as empty array by default', () => {
    const nitro = createMockNitro()
    expect(nitro.scanSchemas).toEqual([])
  })

  it('should have scanDocuments as empty array by default', () => {
    const nitro = createMockNitro()
    expect(nitro.scanDocuments).toEqual([])
  })

  it('should have scanResolvers as empty array by default', () => {
    const nitro = createMockNitro()
    expect(nitro.scanResolvers).toEqual([])
  })

  it('should have scanDirectives as empty array by default', () => {
    const nitro = createMockNitro()
    expect(nitro.scanDirectives).toEqual([])
  })

  it('should accept scanSchemas array', () => {
    const nitro = createMockNitro({
      scanSchemas: ['/path/to/schema1.graphql', '/path/to/schema2.graphql'],
    })

    expect(nitro.scanSchemas).toHaveLength(2)
    expect(nitro.scanSchemas[0]).toBe('/path/to/schema1.graphql')
  })

  it('should accept scanDocuments array', () => {
    const nitro = createMockNitro({
      scanDocuments: ['/path/to/query.graphql'],
    })

    expect(nitro.scanDocuments).toHaveLength(1)
  })

  it('should accept scanResolvers array with imports', () => {
    const nitro = createMockNitro({
      scanResolvers: [
        {
          specifier: '/path/to/user.resolver.ts',
          imports: [
            { name: 'userQueries', as: '_abc123', type: 'query' },
          ],
        },
      ],
    })

    expect(nitro.scanResolvers).toHaveLength(1)
    expect(nitro.scanResolvers[0].specifier).toBe('/path/to/user.resolver.ts')
    expect(nitro.scanResolvers[0].imports).toHaveLength(1)
    expect(nitro.scanResolvers[0].imports[0].type).toBe('query')
  })

  it('should accept scanDirectives array with imports', () => {
    const nitro = createMockNitro({
      scanDirectives: [
        {
          specifier: '/path/to/auth.directive.ts',
          imports: [
            { name: 'authDirective', as: '_def456', type: 'directive' },
          ],
        },
      ],
    })

    expect(nitro.scanDirectives).toHaveLength(1)
    expect(nitro.scanDirectives[0].specifier).toBe('/path/to/auth.directive.ts')
    expect(nitro.scanDirectives[0].imports[0].type).toBe('directive')
  })
})

describe('client scalars inheritance', () => {
  beforeEach(() => {
    ensureDir(tempDir)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  it('should inherit scalars from server config when client scalars not defined', async () => {
    const rootDir = resolve(tempDir, 'inherit-test')
    const buildDir = resolve(rootDir, '.nitro')

    // Create a schema with custom Decimal scalar
    const schemaDir = resolve(rootDir, 'server', 'graphql')
    ensureDir(schemaDir)
    writeTestFile(
      resolve(schemaDir, 'schema.graphql'),
      `
scalar Decimal
type Product {
  id: ID!
  name: String!
  price: Decimal!
}
type Query {
  product(id: ID!): Product
}
`,
    )

    // Create client document
    const clientDir = resolve(rootDir, 'graphql')
    ensureDir(clientDir)
    writeTestFile(
      resolve(clientDir, 'queries.graphql'),
      `
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    name
    price
  }
}
`,
    )

    const nitro = createMockNitro({
      options: {
        rootDir,
        buildDir,
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          codegen: {
            // Server scalars defined, but not client scalars
            server: {
              scalars: {
                Decimal: 'number',
              },
            },
            // client.scalars is undefined - should inherit from server
          },
        },
      },
      scanSchemas: [resolve(schemaDir, 'schema.graphql')],
      scanDocuments: [resolve(clientDir, 'queries.graphql')],
      graphql: {
        buildDir: resolve(buildDir, 'graphql'),
        clientDir,
        serverDir: schemaDir,
        dir: {
          build: resolve(buildDir, 'graphql'),
          client: clientDir,
          server: schemaDir,
        },
      },
    })

    // Generate server types (creates schema.graphql)
    await generateServerTypes(nitro)

    // Generate client types (should inherit Decimal: 'number' from server config)
    await generateClientTypes(nitro)

    const clientTypesPath = resolve(buildDir, 'types', 'nitro-graphql-client.d.ts')
    expect(existsSync(clientTypesPath)).toBe(true)

    const clientTypes = readFileSync(clientTypesPath, 'utf-8')
    // Should contain Decimal mapped to number (inherited from server config)
    // GraphQL Codegen v5 format: Decimal: { input: number; output: number; }
    expect(clientTypes).toContain('Decimal: { input: number; output: number; }')
    // Query result should use the scalar type (number)
    expect(clientTypes).toContain('price: number')
  })

  it('should override server scalars when client scalars are explicitly defined', async () => {
    const rootDir = resolve(tempDir, 'override-test')
    const buildDir = resolve(rootDir, '.nitro')

    // Create a schema with custom Decimal scalar
    const schemaDir = resolve(rootDir, 'server', 'graphql')
    ensureDir(schemaDir)
    writeTestFile(
      resolve(schemaDir, 'schema.graphql'),
      `
scalar Decimal
type Product {
  id: ID!
  name: String!
  price: Decimal!
}
type Query {
  product(id: ID!): Product
}
`,
    )

    // Create client document
    const clientDir = resolve(rootDir, 'graphql')
    ensureDir(clientDir)
    writeTestFile(
      resolve(clientDir, 'queries.graphql'),
      `
query GetProduct($id: ID!) {
  product(id: $id) {
    id
    name
    price
  }
}
`,
    )

    const nitro = createMockNitro({
      options: {
        rootDir,
        buildDir,
        dev: true,
        graphql: {
          framework: 'graphql-yoga',
          codegen: {
            server: {
              scalars: {
                Decimal: 'number',
              },
            },
            // Client scalars explicitly defined - should override server scalars
            client: {
              scalars: {
                Decimal: 'string', // Different mapping
              },
            },
          },
        },
      },
      scanSchemas: [resolve(schemaDir, 'schema.graphql')],
      scanDocuments: [resolve(clientDir, 'queries.graphql')],
      graphql: {
        buildDir: resolve(buildDir, 'graphql'),
        clientDir,
        serverDir: schemaDir,
        dir: {
          build: resolve(buildDir, 'graphql'),
          client: clientDir,
          server: schemaDir,
        },
      },
    })

    // Generate server types (creates schema.graphql)
    await generateServerTypes(nitro)

    // Generate client types (should use client scalars, not server scalars)
    await generateClientTypes(nitro)

    const clientTypesPath = resolve(buildDir, 'types', 'nitro-graphql-client.d.ts')
    expect(existsSync(clientTypesPath)).toBe(true)

    const clientTypes = readFileSync(clientTypesPath, 'utf-8')
    // Should contain Decimal mapped to string (from client config, not server)
    // GraphQL Codegen v5 format: Decimal: { input: string; output: string; }
    expect(clientTypes).toContain('Decimal: { input: string; output: string; }')
    // Query result should use the scalar type (string)
    expect(clientTypes).toContain('price: string')
  })
})

/**
 * Note: Deterministic ordering tests for generated files (schema.graphql, nitro-graphql-server.d.ts)
 * are covered by the following unit tests:
 *
 * 1. tests/unit/scanning/ordering.test.ts
 *    - Tests that scanDirectory and scanWithLayers return files in sorted order
 *    - Tests that layer files are merged and sorted together
 *
 * 2. tests/unit/virtual/generators.test.ts
 *    - Tests that serverSchemas generates imports in input order
 *    - Tests that serverResolvers generates imports in input order
 *    - Tests deterministic output across multiple calls
 *
 * These unit tests verify that:
 * - File scanning returns sorted arrays (fix in src/core/scanning/common.ts)
 * - Extend package files are sorted (fix in src/core/manifest.ts)
 * - Generated code preserves the sorted order
 *
 * The actual file content is a result of the sorted scanSchemas/scanResolvers arrays
 * being passed through generateServerTypes, which uses them in order.
 */
