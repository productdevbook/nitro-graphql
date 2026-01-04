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
import { graphqlConfig, validationSchemas } from '../../../src/nitro/virtual/generators'

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
