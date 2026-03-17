/**
 * Unit tests for rollup integration module
 *
 * Tests the Rollup/Rolldown chunking and externals configuration:
 * - setupRollupChunking: Smart chunking for GraphQL files
 * - setupNoExternals: Ensures route handlers are bundled (not externalized)
 * - setupRollupExternals: Marks codegen and federation packages as external
 */
import type { Nitro } from 'nitro/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CHUNK_NAME_RESOLVERS,
  CHUNK_NAME_SCHEMAS,
  CHUNK_PATH_UNKNOWN,
} from '../../../src/core/constants'
import {
  setupNoExternals,
  setupRollupChunking,
  setupRollupExternals,
} from '../../../src/nitro/setup/rollup-integration'

// ============ Helpers ============

/**
 * Create a minimal mock Nitro instance with hooks support
 */
function createMockNitro(overrides: Partial<Nitro['options']> = {}): Nitro {
  const hookCallbacks: Record<string, Array<(...args: any[]) => void>> = {}

  return {
    options: {
      noExternals: [],
      graphql: {},
      ...overrides,
    },
    hooks: {
      hook: vi.fn((name: string, callback: (...args: any[]) => void) => {
        if (!hookCallbacks[name]) {
          hookCallbacks[name] = []
        }
        hookCallbacks[name].push(callback)
      }),
      // Helper to trigger hooks in tests
      __trigger: (name: string, ...args: any[]) => {
        const callbacks = hookCallbacks[name] || []
        for (const cb of callbacks) {
          cb(...args)
        }
      },
    },
  } as any
}

/**
 * Create a mock rollup config
 */
function createMockRollupConfig(overrides: Record<string, any> = {}) {
  return {
    output: {
      inlineDynamicImports: false,
      manualChunks: undefined,
      chunkFileNames: undefined,
      ...overrides,
    },
    external: [],
  }
}

// ============ Tests ============

describe('rollup integration', () => {
  describe('setupRollupChunking', () => {
    let mockNitro: ReturnType<typeof createMockNitro>

    beforeEach(() => {
      mockNitro = createMockNitro()
    })

    it('should register a rollup:before hook', () => {
      setupRollupChunking(mockNitro)

      expect(mockNitro.hooks.hook).toHaveBeenCalledWith('rollup:before', expect.any(Function))
    })

    it('should skip when inlineDynamicImports is true', () => {
      setupRollupChunking(mockNitro)

      const rollupConfig = createMockRollupConfig({ inlineDynamicImports: true })
      ;(mockNitro.hooks as any).__trigger('rollup:before', mockNitro, rollupConfig)

      // manualChunks should not be set
      expect(rollupConfig.output.manualChunks).toBeUndefined()
    })

    it('should skip when advancedChunks is set', () => {
      setupRollupChunking(mockNitro)

      const rollupConfig = createMockRollupConfig({ advancedChunks: { groups: [] } })
      ;(mockNitro.hooks as any).__trigger('rollup:before', mockNitro, rollupConfig)

      // manualChunks should not be set
      expect(rollupConfig.output.manualChunks).toBeUndefined()
    })

    it('should set manualChunks function when neither condition applies', () => {
      setupRollupChunking(mockNitro)

      const rollupConfig = createMockRollupConfig()
      ;(mockNitro.hooks as any).__trigger('rollup:before', mockNitro, rollupConfig)

      expect(typeof rollupConfig.output.manualChunks).toBe('function')
    })

    describe('manualChunks function', () => {
      let manualChunks: (id: string, meta: unknown) => string | undefined

      beforeEach(() => {
        setupRollupChunking(mockNitro)

        const rollupConfig = createMockRollupConfig()
        ;(mockNitro.hooks as any).__trigger('rollup:before', mockNitro, rollupConfig)

        manualChunks = rollupConfig.output.manualChunks as any
      })

      it('should return schemas chunk for .graphql files', () => {
        const result = manualChunks('/project/server/graphql/schema.graphql', {})

        expect(result).toBe(`graphql/${CHUNK_NAME_SCHEMAS}`)
      })

      it('should return schemas chunk for .gql files', () => {
        const result = manualChunks('/project/server/graphql/types.gql', {})

        expect(result).toBe(`graphql/${CHUNK_NAME_SCHEMAS}`)
      })

      it('should return resolvers chunk for .resolver.ts files', () => {
        const result = manualChunks('/project/server/graphql/user.resolver.ts', {})

        expect(result).toBe(`graphql/${CHUNK_NAME_RESOLVERS}`)
      })

      it('should return resolvers chunk for .resolver.js files', () => {
        const result = manualChunks('/project/server/graphql/user.resolver.js', {})

        expect(result).toBe(`graphql/${CHUNK_NAME_RESOLVERS}`)
      })

      it('should return undefined for non-graphql files', () => {
        const result = manualChunks('/project/server/utils/helper.ts', {})

        expect(result).toBeUndefined()
      })

      it('should return undefined for regular .ts files', () => {
        const result = manualChunks('/project/src/index.ts', {})

        expect(result).toBeUndefined()
      })

      it('should delegate to existing manualChunks for non-graphql files', () => {
        const existingManualChunks = vi.fn().mockReturnValue('vendor')
        const rollupConfig = createMockRollupConfig({ manualChunks: existingManualChunks })

        setupRollupChunking(createMockNitro())
        const nitro2 = createMockNitro()
        setupRollupChunking(nitro2)
        ;(nitro2.hooks as any).__trigger('rollup:before', nitro2, rollupConfig)

        const chunks = rollupConfig.output.manualChunks as any
        const result = chunks('/project/node_modules/lodash/index.js', { meta: true })

        expect(result).toBe('vendor')
        expect(existingManualChunks).toHaveBeenCalledWith('/project/node_modules/lodash/index.js', { meta: true })
      })

      it('should prioritize graphql chunks over existing manualChunks', () => {
        const existingManualChunks = vi.fn().mockReturnValue('vendor')
        const rollupConfig = createMockRollupConfig({ manualChunks: existingManualChunks })

        const nitro2 = createMockNitro()
        setupRollupChunking(nitro2)
        ;(nitro2.hooks as any).__trigger('rollup:before', nitro2, rollupConfig)

        const chunks = rollupConfig.output.manualChunks as any
        const result = chunks('/project/server/graphql/schema.graphql', {})

        expect(result).toBe(`graphql/${CHUNK_NAME_SCHEMAS}`)
        expect(existingManualChunks).not.toHaveBeenCalled()
      })
    })

    describe('chunkFileNames function', () => {
      let chunkFileNames: (chunkInfo: { name?: string, moduleIds?: string[] }) => string

      beforeEach(() => {
        setupRollupChunking(mockNitro)

        const rollupConfig = createMockRollupConfig()
        ;(mockNitro.hooks as any).__trigger('rollup:before', mockNitro, rollupConfig)

        chunkFileNames = rollupConfig.output.chunkFileNames as any
      })

      it('should return graphql chunk path for graphql/ prefixed names', () => {
        const result = chunkFileNames({ name: 'graphql/schemas' })

        expect(result).toBe('chunks/graphql/schemas.mjs')
      })

      it('should return graphql chunk path for graphql/resolvers', () => {
        const result = chunkFileNames({ name: 'graphql/resolvers' })

        expect(result).toBe('chunks/graphql/resolvers.mjs')
      })

      it('should return fallback path for non-graphql chunks', () => {
        const result = chunkFileNames({ name: 'vendor' })

        expect(result).toBe(CHUNK_PATH_UNKNOWN)
      })

      it('should return fallback path when name is undefined', () => {
        const result = chunkFileNames({})

        expect(result).toBe(CHUNK_PATH_UNKNOWN)
      })

      it('should delegate to existing chunkFileNames function for non-graphql chunks', () => {
        const existingChunkFileNames = vi.fn().mockReturnValue('custom/[name].js')
        const rollupConfig = createMockRollupConfig({ chunkFileNames: existingChunkFileNames })

        const nitro2 = createMockNitro()
        setupRollupChunking(nitro2)
        ;(nitro2.hooks as any).__trigger('rollup:before', nitro2, rollupConfig)

        const fn = rollupConfig.output.chunkFileNames as any
        const result = fn({ name: 'vendor' })

        expect(result).toBe('custom/[name].js')
        expect(existingChunkFileNames).toHaveBeenCalledWith({ name: 'vendor' })
      })

      it('should use existing string chunkFileNames for non-graphql chunks', () => {
        const rollupConfig = createMockRollupConfig({ chunkFileNames: 'chunks/[name]-[hash].js' })

        const nitro2 = createMockNitro()
        setupRollupChunking(nitro2)
        ;(nitro2.hooks as any).__trigger('rollup:before', nitro2, rollupConfig)

        const fn = rollupConfig.output.chunkFileNames as any
        const result = fn({ name: 'vendor' })

        expect(result).toBe('chunks/[name]-[hash].js')
      })
    })
  })

  describe('setupNoExternals', () => {
    it('should return early when noExternals is true', () => {
      const nitro = createMockNitro({ noExternals: true as any })

      setupNoExternals(nitro)

      // Should remain true, not be converted to array
      expect(nitro.options.noExternals).toBe(true)
    })

    it('should create array when noExternals is not an array', () => {
      const nitro = createMockNitro({ noExternals: false as any })

      setupNoExternals(nitro)

      expect(Array.isArray(nitro.options.noExternals)).toBe(true)
    })

    it('should push route patterns when noExternals is an empty array', () => {
      const nitro = createMockNitro({ noExternals: [] as any })

      setupNoExternals(nitro)

      const noExternals = nitro.options.noExternals as RegExp[]
      expect(noExternals).toHaveLength(2)
      expect(noExternals[0]).toBeInstanceOf(RegExp)
      expect(noExternals[1]).toBeInstanceOf(RegExp)
    })

    it('should push route patterns to existing array', () => {
      const existingPattern = /some-existing-pattern/
      const nitro = createMockNitro({ noExternals: [existingPattern] as any })

      setupNoExternals(nitro)

      const noExternals = nitro.options.noExternals as RegExp[]
      expect(noExternals).toHaveLength(3) // 1 existing + 2 new
      expect(noExternals[0]).toBe(existingPattern)
    })

    it('should match nitro-graphql route paths', () => {
      const nitro = createMockNitro({ noExternals: [] as any })

      setupNoExternals(nitro)

      const noExternals = nitro.options.noExternals as RegExp[]

      // Test that patterns match expected paths
      const routePath = 'node_modules/nitro-graphql/dist/nitro/routes/graphql-yoga'
      const schemaPath = 'node_modules/nitro-graphql/dist/core/schema'

      expect(noExternals.some(re => re.test(routePath))).toBe(true)
      expect(noExternals.some(re => re.test(schemaPath))).toBe(true)
    })

    it('should match Windows-style paths', () => {
      const nitro = createMockNitro({ noExternals: [] as any })

      setupNoExternals(nitro)

      const noExternals = nitro.options.noExternals as RegExp[]

      // Windows paths use backslashes
      const routePath = 'node_modules\\nitro-graphql\\dist\\nitro\\routes\\graphql-yoga'
      const schemaPath = 'node_modules\\nitro-graphql\\dist\\core\\schema'

      expect(noExternals.some(re => re.test(routePath))).toBe(true)
      expect(noExternals.some(re => re.test(schemaPath))).toBe(true)
    })

    it('should not match unrelated paths', () => {
      const nitro = createMockNitro({ noExternals: [] as any })

      setupNoExternals(nitro)

      const noExternals = nitro.options.noExternals as RegExp[]

      const unrelatedPath = 'node_modules/express/index.js'
      expect(noExternals.some(re => re.test(unrelatedPath))).toBe(false)
    })
  })

  describe('setupRollupExternals', () => {
    let mockNitro: ReturnType<typeof createMockNitro>

    beforeEach(() => {
      mockNitro = createMockNitro()
    })

    it('should register a rollup:before hook', () => {
      setupRollupExternals(mockNitro)

      expect(mockNitro.hooks.hook).toHaveBeenCalledWith('rollup:before', expect.any(Function))
    })

    it('should add codegen externals to array-based external', () => {
      setupRollupExternals(mockNitro)

      const rollupConfig = createMockRollupConfig()
      ;(mockNitro.hooks as any).__trigger('rollup:before', mockNitro, rollupConfig)

      const external = rollupConfig.external as string[]

      expect(external).toContain('oxc-parser')
      expect(external).toContain('@oxc-parser')
      expect(external).toContain('nitro-graphql/native')
    })

    it('should add native platform externals', () => {
      setupRollupExternals(mockNitro)

      const rollupConfig = createMockRollupConfig()
      ;(mockNitro.hooks as any).__trigger('rollup:before', mockNitro, rollupConfig)

      const external = rollupConfig.external as string[]

      expect(external).toContain('nitro-graphql-darwin-arm64')
      expect(external).toContain('nitro-graphql-darwin-x64')
      expect(external).toContain('nitro-graphql-linux-x64-gnu')
      expect(external).toContain('nitro-graphql-linux-arm64-gnu')
      expect(external).toContain('nitro-graphql-win32-x64-msvc')
    })

    it('should add federation externals when federation is NOT enabled', () => {
      setupRollupExternals(mockNitro)

      const rollupConfig = createMockRollupConfig()
      ;(mockNitro.hooks as any).__trigger('rollup:before', mockNitro, rollupConfig)

      const external = rollupConfig.external as string[]

      expect(external).toContain('@apollo/subgraph')
      expect(external).toContain('@apollo/federation-internals')
      expect(external).toContain('@apollo/cache-control-types')
    })

    it('should NOT add federation externals when federation IS enabled', () => {
      const nitro = createMockNitro({
        graphql: { federation: { enabled: true } } as any,
      })

      setupRollupExternals(nitro)

      const rollupConfig = createMockRollupConfig()
      ;(nitro.hooks as any).__trigger('rollup:before', nitro, rollupConfig)

      const external = rollupConfig.external as string[]

      expect(external).not.toContain('@apollo/subgraph')
      expect(external).not.toContain('@apollo/federation-internals')
      expect(external).not.toContain('@apollo/cache-control-types')
      // But codegen externals should still be there
      expect(external).toContain('oxc-parser')
    })

    it('should handle function-based rollupConfig.external', () => {
      const originalExternal = vi.fn().mockReturnValue(false)
      const nitro = createMockNitro()
      setupRollupExternals(nitro)

      const rollupConfig = { ...createMockRollupConfig(), external: originalExternal }
      ;(nitro.hooks as any).__trigger('rollup:before', nitro, rollupConfig)

      expect(typeof rollupConfig.external).toBe('function')

      // Should return true for known externals
      const externalFn = rollupConfig.external as (id: string, parent: string | undefined, isResolved: boolean) => boolean
      expect(externalFn('oxc-parser', undefined, false)).toBe(true)
      expect(externalFn('nitro-graphql/native', undefined, false)).toBe(true)
      expect(externalFn('@apollo/subgraph', undefined, false)).toBe(true)
    })

    it('should delegate to original external function for non-matching ids', () => {
      const originalExternal = vi.fn().mockReturnValue(false)
      const nitro = createMockNitro()
      setupRollupExternals(nitro)

      const rollupConfig = { ...createMockRollupConfig(), external: originalExternal }
      ;(nitro.hooks as any).__trigger('rollup:before', nitro, rollupConfig)

      const externalFn = rollupConfig.external as (id: string, parent: string | undefined, isResolved: boolean) => boolean
      const result = externalFn('express', '/project/src/index.ts', true)

      expect(result).toBe(false)
      expect(originalExternal).toHaveBeenCalledWith('express', '/project/src/index.ts', true)
    })

    it('should match externals by substring (includes check)', () => {
      const nitro = createMockNitro()
      setupRollupExternals(nitro)

      const rollupConfig = { ...createMockRollupConfig(), external: vi.fn().mockReturnValue(false) }
      ;(nitro.hooks as any).__trigger('rollup:before', nitro, rollupConfig)

      const externalFn = rollupConfig.external as (id: string, parent: string | undefined, isResolved: boolean) => boolean

      // Should match when the external name is part of a longer path
      expect(externalFn('/node_modules/oxc-parser/index.js', undefined, false)).toBe(true)
      expect(externalFn('nitro-graphql-darwin-arm64/native.node', undefined, false)).toBe(true)
    })

    it('should initialize external to empty array when undefined', () => {
      const nitro = createMockNitro()
      setupRollupExternals(nitro)

      const rollupConfig = { output: { inlineDynamicImports: false } } as any
      ;(nitro.hooks as any).__trigger('rollup:before', nitro, rollupConfig)

      // Should have initialized external and added entries
      expect(Array.isArray(rollupConfig.external)).toBe(true)
      expect((rollupConfig.external as string[]).length).toBeGreaterThan(0)
    })

    it('should preserve existing array external entries', () => {
      const nitro = createMockNitro()
      setupRollupExternals(nitro)

      const rollupConfig = createMockRollupConfig()
      ;(rollupConfig as any).external = ['existing-package']
      ;(nitro.hooks as any).__trigger('rollup:before', nitro, rollupConfig)

      const external = rollupConfig.external as string[]
      expect(external).toContain('existing-package')
      expect(external).toContain('oxc-parser')
    })
  })
})
