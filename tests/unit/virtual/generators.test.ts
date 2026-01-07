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
import { describe, expect, it, vi } from 'vitest'
import { graphqlConfig, serverResolvers, serverSchemas, validationSchemas } from '../../../src/nitro/virtual/generators'

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

describe('serverSchemas virtual module - deterministic ordering', () => {
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
      },
      options: {
        dev: false,
        graphql: {},
      },
      logger: { warn: () => {} },
    } as unknown as Nitro
  }

  it('should generate imports in same order as input array', () => {
    const schemas = [
      '/server/graphql/a-first.graphql',
      '/server/graphql/b-second.graphql',
      '/server/graphql/c-third.graphql',
    ]
    const nitro = createSchemaMockNitro(schemas)
    const code = serverSchemas.getCode(nitro)

    // Verify imports are in order
    const importLines = code.split('\n').filter(l => l.startsWith('import'))
    expect(importLines[0]).toContain('a-first.graphql')
    expect(importLines[1]).toContain('b-second.graphql')
    expect(importLines[2]).toContain('c-third.graphql')
  })

  it('should generate deterministic output for sorted schemas', () => {
    // Simulate sorted schema paths (as scanning should provide)
    const schemas = [
      '/server/graphql/auth.graphql',
      '/server/graphql/user.graphql',
      '/server/graphql/z-last.graphql',
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
  })

  it('should preserve alphabetical order in export array', () => {
    const schemas = [
      '/server/graphql/a.graphql',
      '/server/graphql/m.graphql',
      '/server/graphql/z.graphql',
    ]
    const nitro = createSchemaMockNitro(schemas)
    const code = serverSchemas.getCode(nitro)

    // Verify imports appear in same order as input
    const importLines = code.split('\n').filter(l => l.startsWith('import'))
    expect(importLines).toHaveLength(3)
    expect(importLines[0]).toContain('a.graphql')
    expect(importLines[1]).toContain('m.graphql')
    expect(importLines[2]).toContain('z.graphql')

    // Verify export array has entries in same order as imports
    const exportMatch = code.match(/export const schemas = \[([\s\S]*?)\];/)
    expect(exportMatch).toBeTruthy()
    const exportEntries = exportMatch![1].split(',').map(s => s.trim()).filter(Boolean)
    expect(exportEntries).toHaveLength(3)
  })
})

describe('serverResolvers virtual module - deterministic ordering', () => {
  function createResolverMockNitro(resolvers: Array<{ specifier: string, imports: Array<{ name: string }> }>): Nitro {
    return {
      scanResolvers: resolvers.map(r => ({
        specifier: r.specifier,
        imports: r.imports,
      })),
      graphql: {
        serverDir: '/server/graphql',
        buildDir: '',
        watchDirs: [],
        clientDir: '',
        dir: { build: '', client: '', server: '' },
        directiveSchemas: null,
        extendConfigs: [],
        extendSchemas: [],
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
    const resolversArrayMatch = code.match(/export const resolvers = \[([\s\S]*?)\]/)
    expect(resolversArrayMatch).toBeTruthy()

    const arrayContent = resolversArrayMatch![1]
    const aIndex = arrayContent.indexOf('aResolver')
    const mIndex = arrayContent.indexOf('mResolver')
    const zIndex = arrayContent.indexOf('zResolver')

    expect(aIndex).toBeLessThan(mIndex)
    expect(mIndex).toBeLessThan(zIndex)
  })
})
