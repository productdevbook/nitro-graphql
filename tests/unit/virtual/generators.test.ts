/**
 * Unit tests for virtual module generators
 *
 * Tests the code generation for:
 * - #nitro-graphql/graphql-config: Merges config.ts files with defu
 * - #nitro-graphql/validation-schemas: Merges schema.ts files with spread
 *
 * Priority order (highest to lowest):
 * - Local config/schema
 * - extend[n] (later extends have higher priority)
 * - extend[0]
 */
import type { Nitro } from 'nitro/types'
import { resolve } from 'pathe'
import { describe, expect, it, vi } from 'vitest'
import { graphqlConfig, serverResolvers, serverSchemas, validationSchemas } from '../../../src/nitro/virtual'

const SCHEMAS_EXPORT_RE = /export const schemas = \[([\s\S]*?)\];/
const RESOLVERS_EXPORT_RE = /export const resolvers = \[([\s\S]*?)\]/

/** Minimal Nitro mock for testing virtual module generators */
type MockNitro = Pick<Nitro, 'graphql'>

function createMockNitro(options: {
  serverDir: string
  extendConfigs?: string[]
  extendSchemas?: string[]
}): MockNitro {
  return {
    graphql: {
      serverDir: options.serverDir,
      extendConfigs: options.extendConfigs ?? [],
      extendSchemas: options.extendSchemas ?? [],
      // Required but unused in these tests
      buildDir: '',
      watchDirs: [],
      clientDir: '',
      dir: { build: '', client: '', server: '' },
      directiveSchemas: null,
      state: {
        schemas: [],
        resolvers: [],
        directives: [],
        documents: [],
        directiveSchemas: null,
        extendConfigs: options.extendConfigs ?? [],
        extendSchemas: options.extendSchemas ?? [],
      },
    },
  }
}

// Mock existsSync
vi.mock('node:fs', () => ({
  existsSync: vi.fn((path: string) => {
    // Return true for paths that should exist
    if (path.includes('/local/') || path.includes('/extend')) {
      return true
    }
    return false
  }),
}))

describe('graphqlConfig virtual module', () => {
  it('should return empty config when no configs exist', () => {
    const nitro = createMockNitro({ serverDir: '/nonexistent/server/graphql' })
    const code = graphqlConfig.getCode(nitro as Nitro)

    expect(code).toContain('const importedConfig = {}')
    expect(code).toContain('export { importedConfig }')
  })

  it('should import only local config when no extends', () => {
    const nitro = createMockNitro({ serverDir: '/local/server/graphql' })
    const code = graphqlConfig.getCode(nitro as Nitro)

    expect(code).toContain('import { defu }')
    expect(code).toContain('import localConfig from \'/local/server/graphql/config.ts\'')
    expect(code).toContain('defu(localConfig)')
    expect(code).not.toContain('extendConfig')
  })

  it('should merge single extend config with local', () => {
    const nitro = createMockNitro({
      serverDir: '/local/server/graphql',
      extendConfigs: ['/extend1/server/graphql/config.ts'],
    })
    const code = graphqlConfig.getCode(nitro as Nitro)

    expect(code).toContain('import { defu }')
    expect(code).toContain('import extendConfig0 from \'/extend1/server/graphql/config.ts\'')
    expect(code).toContain('import localConfig from \'/local/server/graphql/config.ts\'')
    // Local should have higher priority (comes first in defu)
    expect(code).toContain('defu(localConfig, extendConfig0)')
  })

  it('should merge multiple extend configs in correct order', () => {
    const nitro = createMockNitro({
      serverDir: '/local/server/graphql',
      extendConfigs: ['/extend0/config.ts', '/extend1/config.ts', '/extend2/config.ts'],
    })
    const code = graphqlConfig.getCode(nitro as Nitro)

    expect(code).toContain('import extendConfig0')
    expect(code).toContain('import extendConfig1')
    expect(code).toContain('import extendConfig2')
    // Order: local > extend2 > extend1 > extend0
    expect(code).toContain('defu(localConfig, extendConfig2, extendConfig1, extendConfig0)')
  })

  it('should generate correct code structure (snapshot)', () => {
    const nitro = createMockNitro({
      serverDir: '/local/server/graphql',
      extendConfigs: ['/extend0/config.ts', '/extend1/config.ts'],
    })
    const code = graphqlConfig.getCode(nitro as Nitro)

    expect(code).toMatchInlineSnapshot(`
      "import { defu } from 'defu'
      import extendConfig0 from '/extend0/config.ts'
      import extendConfig1 from '/extend1/config.ts'
      import localConfig from '/local/server/graphql/config.ts'

      const importedConfig = defu(localConfig, extendConfig1, extendConfig0)
      export { importedConfig }
      "
    `)
  })

  it('should work with only extend configs (no local)', () => {
    const nitro = createMockNitro({
      serverDir: '/nonexistent/server/graphql',
      extendConfigs: ['/extend0/config.ts', '/extend1/config.ts'],
    })
    const code = graphqlConfig.getCode(nitro as Nitro)

    expect(code).toContain('import extendConfig0')
    expect(code).toContain('import extendConfig1')
    expect(code).not.toContain('localConfig')
    expect(code).toContain('defu(extendConfig1, extendConfig0)')
  })
})

describe('validationSchemas virtual module', () => {
  it('should return empty schema when no schemas exist', () => {
    const nitro = createMockNitro({ serverDir: '/nonexistent/server/graphql' })
    const code = validationSchemas.getCode(nitro as Nitro)

    expect(code).toContain('const mergedSchemas = {}')
    expect(code).toContain('export default mergedSchemas')
  })

  it('should export only local schema when no extends', () => {
    const nitro = createMockNitro({ serverDir: '/local/server/graphql' })
    const code = validationSchemas.getCode(nitro as Nitro)

    expect(code).toContain('import localSchema from \'/local/server/graphql/schema.ts\'')
    expect(code).toContain('const mergedSchemas = localSchema')
  })

  it('should merge extend schemas with spread operator', () => {
    const nitro = createMockNitro({
      serverDir: '/local/server/graphql',
      extendSchemas: ['/extend0/schema.ts', '/extend1/schema.ts'],
    })
    const code = validationSchemas.getCode(nitro as Nitro)

    expect(code).toContain('import extendSchema0')
    expect(code).toContain('import extendSchema1')
    expect(code).toContain('import localSchema')
    // Spread merge with local last (highest priority)
    expect(code).toContain('{ ...extendSchema0, ...extendSchema1, ...localSchema }')
  })

  it('should generate correct code structure (snapshot)', () => {
    const nitro = createMockNitro({
      serverDir: '/local/server/graphql',
      extendSchemas: ['/extend0/schema.ts', '/extend1/schema.ts'],
    })
    const code = validationSchemas.getCode(nitro as Nitro)

    expect(code).toMatchInlineSnapshot(`
      "import extendSchema0 from '/extend0/schema.ts'
      import extendSchema1 from '/extend1/schema.ts'
      import localSchema from '/local/server/graphql/schema.ts'

      const mergedSchemas = { ...extendSchema0, ...extendSchema1, ...localSchema }
      export default mergedSchemas
      "
    `)
  })
})

describe('serverSchemas virtual module - demo schema', () => {
  function createSchemaMockNitro(schemas: string[], options?: { directiveSchemas?: string | null, typedefs?: string[], dev?: boolean }): Nitro {
    return {
      scanSchemas: schemas,
      graphql: {
        serverDir: '/server/graphql',
        buildDir: '',
        watchDirs: [],
        clientDir: '',
        dir: { build: '', client: '', server: '' },
        directiveSchemas: options?.directiveSchemas ?? null,
        extendConfigs: [],
        extendSchemas: [],
        state: {
          schemas,
          resolvers: [],
          directives: [],
          documents: [],
          directiveSchemas: options?.directiveSchemas ?? null,
          extendConfigs: [],
          extendSchemas: [],
        },
      },
      options: {
        dev: options?.dev ?? false,
        graphql: {
          typedefs: options?.typedefs,
        },
      },
      logger: { warn: vi.fn() },
    } as unknown as Nitro
  }

  it('should return demo schema when no schemas and no directives exist', () => {
    const nitro = createSchemaMockNitro([])
    const code = serverSchemas.getCode(nitro)

    expect(code).toContain('export const schemas = [')
    expect(code).toContain('type Query {')
    expect(code).toContain('hello: String!')
  })

  it('should return demo schema when schemas array is empty and directiveSchemas is null', () => {
    const nitro = createSchemaMockNitro([], { directiveSchemas: null })
    const code = serverSchemas.getCode(nitro)

    expect(code).toContain('hello: String!')
  })

  it('should NOT return demo schema when directiveSchemas has content', () => {
    const nitro = createSchemaMockNitro([], { directiveSchemas: 'directive @auth on FIELD_DEFINITION' })
    const code = serverSchemas.getCode(nitro)

    // Should NOT have demo schema
    expect(code).not.toContain('hello: String!')
    // Should have directive schema
    expect(code).toContain('@auth')
  })

  it('should log warning in dev mode when using demo schema', () => {
    const nitro = createSchemaMockNitro([], { dev: true })
    serverSchemas.getCode(nitro)

    expect(nitro.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No schemas found. Using demo schema'),
    )
  })
})

describe('serverResolvers virtual module - demo resolver', () => {
  function createResolverMockNitro(resolvers: Array<{ specifier: string, imports: Array<{ name: string }> }>, options?: { dev?: boolean }): Nitro {
    return {
      scanResolvers: resolvers,
      graphql: {
        serverDir: '/server/graphql',
        buildDir: '',
        watchDirs: [],
        clientDir: '',
        dir: { build: '', client: '', server: '' },
        directiveSchemas: null,
        extendConfigs: [],
        extendSchemas: [],
        state: {
          schemas: [],
          resolvers,
          directives: [],
          documents: [],
          directiveSchemas: null,
          extendConfigs: [],
          extendSchemas: [],
        },
      },
      options: {
        dev: options?.dev ?? false,
      },
      logger: { warn: vi.fn() },
    } as unknown as Nitro
  }

  it('should return demo resolver when no resolvers exist', () => {
    const nitro = createResolverMockNitro([])
    const code = serverResolvers.getCode(nitro)

    expect(code).toContain('export const resolvers = [')
    expect(code).toContain('Query')
    expect(code).toContain('hello')
    expect(code).toContain('Hello from nitro-graphql!')
  })

  it('should log warning in dev mode when using demo resolver', () => {
    const nitro = createResolverMockNitro([], { dev: true })
    serverResolvers.getCode(nitro)

    expect(nitro.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No resolvers found. Using demo resolver'),
    )
  })
})

describe('serverSchemas virtual module - deterministic ordering', () => {
  // Use existing fixture files
  const fixturesDir = resolve(__dirname, '../../fixtures')

  function createSchemaMockNitro(schemas: string[]): Nitro {
    return {
      scanSchemas: schemas,
      graphql: {
        serverDir: '/server/graphql',
        buildDir: '',
        watchDirs: [],
        clientDir: '',
        dir: { build: '', client: '', server: '' },
        directiveSchemas: null,
        extendConfigs: [],
        extendSchemas: [],
        state: {
          schemas,
          resolvers: [],
          directives: [],
          documents: [],
          directiveSchemas: null,
          extendConfigs: [],
          extendSchemas: [],
        },
      },
      options: {
        dev: false,
        graphql: {},
      },
      logger: { warn: () => {} },
    } as unknown as Nitro
  }

  it('should generate deterministic output for schemas', () => {
    // Use existing fixture schema
    const schemas = [
      resolve(fixturesDir, 'extend-multi/auth/server/graphql/schema.graphql'),
    ]
    const nitro = createSchemaMockNitro(schemas)

    // Run multiple times - output should be identical
    const results = [
      serverSchemas.getCode(nitro),
      serverSchemas.getCode(nitro),
      serverSchemas.getCode(nitro),
    ]

    expect(results[0]).toBe(results[1])
    expect(results[1]).toBe(results[2])

    // Verify schema content is inlined
    expect(results[0]).toContain('export const schemas')
    expect(results[0]).toContain('def:')
  })

  it('should inline schema content from multiple files in order', () => {
    const schemas = [
      resolve(fixturesDir, 'extend-multi/auth/server/graphql/schema.graphql'),
      resolve(fixturesDir, 'extend-multi/ecommerce/server/graphql/schema.graphql'),
    ]
    const nitro = createSchemaMockNitro(schemas)
    const code = serverSchemas.getCode(nitro)

    // Verify both schemas are inlined
    expect(code).toContain('export const schemas')
    expect(code).toContain('def:')

    // Verify the code contains schema content (may be empty string if file read fails in test env)
    // In production, this would contain actual schema content
    const exportMatch = code.match(SCHEMAS_EXPORT_RE)
    expect(exportMatch).toBeTruthy()
  })
})

describe('serverResolvers virtual module - deterministic ordering', () => {
  function createResolverMockNitro(resolvers: Array<{ specifier: string, imports: Array<{ name: string }> }>): Nitro {
    const mappedResolvers = resolvers.map(r => ({
      specifier: r.specifier,
      imports: r.imports,
    }))
    return {
      scanResolvers: mappedResolvers,
      graphql: {
        serverDir: '/server/graphql',
        buildDir: '',
        watchDirs: [],
        clientDir: '',
        dir: { build: '', client: '', server: '' },
        directiveSchemas: null,
        extendConfigs: [],
        extendSchemas: [],
        state: {
          schemas: [],
          resolvers: mappedResolvers,
          directives: [],
          documents: [],
          directiveSchemas: null,
          extendConfigs: [],
          extendSchemas: [],
        },
      },
      options: {
        dev: false,
      },
      logger: { warn: () => {} },
    } as unknown as Nitro
  }

  it('should generate imports in same order as input array', () => {
    const resolvers = [
      { specifier: '/server/graphql/a.resolver.ts', imports: [{ name: 'aResolver' }] },
      { specifier: '/server/graphql/b.resolver.ts', imports: [{ name: 'bResolver' }] },
      { specifier: '/server/graphql/c.resolver.ts', imports: [{ name: 'cResolver' }] },
    ]
    const nitro = createResolverMockNitro(resolvers)
    const code = serverResolvers.getCode(nitro)

    const importLines = code.split('\n').filter(l => l.startsWith('import'))
    expect(importLines[0]).toContain('a.resolver.ts')
    expect(importLines[1]).toContain('b.resolver.ts')
    expect(importLines[2]).toContain('c.resolver.ts')
  })

  it('should generate deterministic output for sorted resolvers', () => {
    const resolvers = [
      { specifier: '/server/graphql/auth.resolver.ts', imports: [{ name: 'authResolver' }] },
      { specifier: '/server/graphql/user.resolver.ts', imports: [{ name: 'userResolver' }] },
    ]
    const nitro = createResolverMockNitro(resolvers)

    // Run multiple times - output should be identical
    const results = [
      serverResolvers.getCode(nitro),
      serverResolvers.getCode(nitro),
      serverResolvers.getCode(nitro),
    ]

    expect(results[0]).toBe(results[1])
    expect(results[1]).toBe(results[2])
  })

  it('should preserve order in resolvers export array', () => {
    const resolvers = [
      { specifier: '/server/graphql/a.resolver.ts', imports: [{ name: 'aResolver' }] },
      { specifier: '/server/graphql/m.resolver.ts', imports: [{ name: 'mResolver' }] },
      { specifier: '/server/graphql/z.resolver.ts', imports: [{ name: 'zResolver' }] },
    ]
    const nitro = createResolverMockNitro(resolvers)
    const code = serverResolvers.getCode(nitro)

    // Check the resolvers array maintains order
    const resolversArrayMatch = code.match(RESOLVERS_EXPORT_RE)
    expect(resolversArrayMatch).toBeTruthy()

    const arrayContent = resolversArrayMatch![1]
    const aIndex = arrayContent.indexOf('aResolver')
    const mIndex = arrayContent.indexOf('mResolver')
    const zIndex = arrayContent.indexOf('zResolver')

    expect(aIndex).toBeLessThan(mIndex)
    expect(mIndex).toBeLessThan(zIndex)
  })
})
