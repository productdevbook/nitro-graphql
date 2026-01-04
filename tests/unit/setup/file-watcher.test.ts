/**
 * Unit tests for file watcher setup module
 *
 * Tests the file watcher setup logic which:
 * - Sets up chokidar file watchers for GraphQL files
 * - Filters files based on extensions (.graphql, .gql, .resolver.ts, .directive.ts)
 * - Ignores build directories and node_modules
 * - Debounces changes and triggers type regeneration
 * - Determines watch directories based on framework (Nuxt, Nitro, standalone)
 */
import type { Nitro } from 'nitro/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DIR_SERVER_GRAPHQL,
  DIR_SERVER_GRAPHQL_WIN,
  DIRECTIVE_EXTENSIONS,
  GRAPHQL_EXTENSIONS,
  RESOLVER_EXTENSIONS,
} from '../../../src/core/constants'
import { getWatchDirectories, setupFileWatcher } from '../../../src/nitro/setup/file-watcher'

// Mock chokidar
vi.mock('chokidar', () => ({
  watch: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    close: vi.fn(),
  })),
}))

// Mock consola
vi.mock('consola', () => ({
  default: {
    withTag: vi.fn(() => ({
      info: vi.fn(),
      success: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}))

// Mock perfect-debounce
vi.mock('perfect-debounce', () => ({
  debounce: vi.fn((fn: () => void) => fn),
}))

// Mock NitroAdapter
vi.mock('../../../src/nitro/adapter', () => ({
  NitroAdapter: {
    scanSchemas: vi.fn().mockResolvedValue({ items: [] }),
    scanResolvers: vi.fn().mockResolvedValue({ items: [] }),
    scanDirectives: vi.fn().mockResolvedValue({ items: [] }),
    scanDocuments: vi.fn().mockResolvedValue({ items: [] }),
  },
}))

// Mock codegen
vi.mock('../../../src/nitro/codegen', () => ({
  generateServerTypes: vi.fn().mockResolvedValue(undefined),
  generateClientTypes: vi.fn().mockResolvedValue(undefined),
}))

// Mock directive parser
vi.mock('../../../src/core/utils/directive-parser', () => ({
  generateDirectiveSchemas: vi.fn().mockResolvedValue([]),
}))

// Mock extend loader
vi.mock('../../../src/nitro/setup/extend-loader', () => ({
  resolveExtendConfig: vi.fn().mockResolvedValue(undefined),
}))

// Mock scanner
vi.mock('../../../src/nitro/setup/scanner', () => ({
  shouldScanLocalFiles: vi.fn(() => true),
  performGraphQLScan: vi.fn().mockResolvedValue(undefined),
}))

/**
 * Create a minimal mock Nitro instance for testing
 */
function createMockNitro(overrides: Partial<Nitro> = {}): Nitro {
  const defaultNitro: Partial<Nitro> = {
    options: {
      rootDir: '/project',
      dev: true,
      framework: { name: 'nitro' },
      graphql: {
        layerServerDirs: [],
        layerAppDirs: [],
      },
      ignore: [],
    } as any,
    graphql: {
      buildDir: '/project/.nitro',
      serverDir: '/project/server/graphql',
      clientDir: '/project/graphql',
      directiveSchemas: [],
    } as any,
    scanSchemas: [],
    scanResolvers: [],
    scanDirectives: [],
    scanDocuments: [],
    hooks: {
      callHook: vi.fn(),
    } as any,
    logger: {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
      debug: vi.fn(),
    } as any,
  }

  return {
    ...defaultNitro,
    ...overrides,
    options: { ...defaultNitro.options, ...(overrides.options || {}) },
    graphql: { ...defaultNitro.graphql, ...(overrides.graphql || {}) },
  } as Nitro
}

describe('setupFileWatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('watcher creation', () => {
    it('should create a chokidar watcher with provided directories', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql', '/project/graphql']

      setupFileWatcher(nitro, watchDirs)

      expect(watch).toHaveBeenCalledWith(watchDirs, expect.any(Object))
    })

    it('should return the created watcher', async () => {
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      const result = setupFileWatcher(nitro, watchDirs)

      expect(result).toBeDefined()
      expect(result.on).toBeDefined()
    })

    it('should configure watcher with persistent mode', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      expect(watch).toHaveBeenCalledWith(watchDirs, expect.objectContaining({
        persistent: true,
      }))
    })

    it('should configure watcher to ignore initial files', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      expect(watch).toHaveBeenCalledWith(watchDirs, expect.objectContaining({
        ignoreInitial: true,
      }))
    })

    it('should register an "all" event handler', async () => {
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      const watcher = setupFileWatcher(nitro, watchDirs)

      expect(watcher.on).toHaveBeenCalledWith('all', expect.any(Function))
    })
  })

  describe('file ignore logic', () => {
    it('should pass an ignored function to chokidar', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const callArgs = vi.mocked(watch).mock.calls[0]
      expect(callArgs[1]).toHaveProperty('ignored')
      expect(typeof callArgs[1]?.ignored).toBe('function')
    })

    it('should ignore node_modules directory', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/node_modules/graphql/index.js')).toBe(true)
    })

    it('should ignore .git directory', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/.git/config')).toBe(true)
    })

    it('should ignore .output directory', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/.output/server/index.mjs')).toBe(true)
    })

    it('should ignore .nitro directory', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/.nitro/types/index.d.ts')).toBe(true)
    })

    it('should ignore .nuxt directory', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/.nuxt/types/index.d.ts')).toBe(true)
    })

    it('should ignore .graphql directory', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/.graphql/generated.d.ts')).toBe(true)
    })

    it('should allow directory traversal (no extension)', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql')).toBe(false)
    })

    it('should allow directory paths ending with slash', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/')).toBe(false)
    })

    it('should allow .graphql files', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/schema.graphql')).toBe(false)
    })

    it('should allow .gql files', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/schema.gql')).toBe(false)
    })

    it('should allow .resolver.ts files', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/user.resolver.ts')).toBe(false)
    })

    it('should allow .resolver.js files', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/user.resolver.js')).toBe(false)
    })

    it('should allow .directive.ts files', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/auth.directive.ts')).toBe(false)
    })

    it('should allow .directive.js files', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/auth.directive.js')).toBe(false)
    })

    it('should ignore .ts files that are not resolvers or directives', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/utils.ts')).toBe(true)
    })

    it('should ignore .js files that are not resolvers or directives', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/utils.js')).toBe(true)
    })

    it('should ignore .json files', async () => {
      const { watch } = await import('chokidar')
      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      const ignored = vi.mocked(watch).mock.calls[0]?.[1]?.ignored as (path: string) => boolean
      expect(ignored('/project/server/graphql/config.json')).toBe(true)
    })
  })

  describe('file change handling (processChanges)', () => {
    it('should call performGraphQLScan when server file changes', async () => {
      const { watch } = await import('chokidar')
      const { performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      // Create a mock watcher that captures the 'all' event handler
      let allEventHandler: ((event: string, path: string) => void) | null = null
      const mockWatcher = {
        on: vi.fn((event: string, handler: (event: string, path: string) => void) => {
          if (event === 'all') {
            allEventHandler = handler
          }
          return mockWatcher
        }),
        close: vi.fn(),
      }
      vi.mocked(watch).mockReturnValue(mockWatcher as any)

      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      // Simulate a .graphql file change
      expect(allEventHandler).not.toBeNull()
      allEventHandler!('change', '/project/server/graphql/schema.graphql')

      // Wait for debounced function to be called
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(performGraphQLScan).toHaveBeenCalledWith(nitro, { silent: true, isRescan: true })
    })

    it('should call performGraphQLScan when resolver file changes', async () => {
      const { watch } = await import('chokidar')
      const { performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      let allEventHandler: ((event: string, path: string) => void) | null = null
      const mockWatcher = {
        on: vi.fn((event: string, handler: (event: string, path: string) => void) => {
          if (event === 'all') {
            allEventHandler = handler
          }
          return mockWatcher
        }),
        close: vi.fn(),
      }
      vi.mocked(watch).mockReturnValue(mockWatcher as any)

      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      // Simulate a .resolver.ts file change
      allEventHandler!('change', '/project/server/graphql/user.resolver.ts')

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(performGraphQLScan).toHaveBeenCalledWith(nitro, { silent: true, isRescan: true })
    })

    it('should NOT call performGraphQLScan for non-graphql files', async () => {
      const { watch } = await import('chokidar')
      const { performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(performGraphQLScan).mockClear()

      let allEventHandler: ((event: string, path: string) => void) | null = null
      const mockWatcher = {
        on: vi.fn((event: string, handler: (event: string, path: string) => void) => {
          if (event === 'all') {
            allEventHandler = handler
          }
          return mockWatcher
        }),
        close: vi.fn(),
      }
      vi.mocked(watch).mockReturnValue(mockWatcher as any)

      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      // Simulate a non-graphql file change
      allEventHandler!('change', '/project/server/graphql/utils.ts')

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(performGraphQLScan).not.toHaveBeenCalled()
    })

    it('should NOT call performGraphQLScan for sdk.ts files', async () => {
      const { watch } = await import('chokidar')
      const { performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(performGraphQLScan).mockClear()

      let allEventHandler: ((event: string, path: string) => void) | null = null
      const mockWatcher = {
        on: vi.fn((event: string, handler: (event: string, path: string) => void) => {
          if (event === 'all') {
            allEventHandler = handler
          }
          return mockWatcher
        }),
        close: vi.fn(),
      }
      vi.mocked(watch).mockReturnValue(mockWatcher as any)

      const nitro = createMockNitro()
      const watchDirs = ['/project/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      // Simulate sdk.ts file change (should be ignored)
      allEventHandler!('change', '/project/graphql/sdk.ts')

      await new Promise(resolve => setTimeout(resolve, 10))

      expect(performGraphQLScan).not.toHaveBeenCalled()
    })

    it('should use performGraphQLScan with isRescan:true to respect skipLocalScan during file changes', async () => {
      // This test verifies the fix for the bug where skipLocalScan was ignored during rescan.
      // Previously, processChanges called NitroAdapter.scanSchemas directly which ignored skipLocalScan.
      // Now it calls performGraphQLScan which properly handles skipLocalScan.
      const { watch } = await import('chokidar')
      const { performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { NitroAdapter } = await import('../../../src/nitro/adapter')

      vi.mocked(performGraphQLScan).mockClear()
      vi.mocked(NitroAdapter.scanSchemas).mockClear()
      vi.mocked(NitroAdapter.scanResolvers).mockClear()
      vi.mocked(NitroAdapter.scanDirectives).mockClear()

      let allEventHandler: ((event: string, path: string) => void) | null = null
      const mockWatcher = {
        on: vi.fn((event: string, handler: (event: string, path: string) => void) => {
          if (event === 'all') {
            allEventHandler = handler
          }
          return mockWatcher
        }),
        close: vi.fn(),
      }
      vi.mocked(watch).mockReturnValue(mockWatcher as any)

      // Create nitro with skipLocalScan: true
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: { skipLocalScan: true },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })
      // Watch extend package directory (simulating extend: ['./auth'])
      const watchDirs = ['/packages/auth/server/graphql']

      setupFileWatcher(nitro, watchDirs)

      // Simulate a file change in extend package (path includes 'server/graphql' so it's detected as server file)
      allEventHandler!('change', '/packages/auth/server/graphql/schema.graphql')

      await new Promise(resolve => setTimeout(resolve, 10))

      // Should call performGraphQLScan (which respects skipLocalScan)
      expect(performGraphQLScan).toHaveBeenCalledWith(nitro, { silent: true, isRescan: true })

      // Should NOT call NitroAdapter methods directly (old buggy behavior)
      expect(NitroAdapter.scanSchemas).not.toHaveBeenCalled()
      expect(NitroAdapter.scanResolvers).not.toHaveBeenCalled()
      expect(NitroAdapter.scanDirectives).not.toHaveBeenCalled()
    })
  })
})

describe('getWatchDirectories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('nitro framework', () => {
    it('should include client directory for nitro', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {},
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/graphql')
    })

    it('should include server directory when local scanning enabled', async () => {
      const { shouldScanLocalFiles } = await import('../../../src/nitro/setup/scanner')
      vi.mocked(shouldScanLocalFiles).mockReturnValue(true)

      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {},
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/server/graphql')
    })

    it('should not include server directory when local scanning disabled', async () => {
      const { shouldScanLocalFiles } = await import('../../../src/nitro/setup/scanner')
      vi.mocked(shouldScanLocalFiles).mockReturnValue(false)

      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: { skipLocalScan: true },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).not.toContain('/project/server/graphql')
    })
  })

  describe('nuxt framework', () => {
    it('should include client directory for nuxt', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nuxt' },
          graphql: {
            layerServerDirs: [],
            layerAppDirs: [],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nuxt',
          serverDir: '/project/server/graphql',
          clientDir: '/project/app/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/app/graphql')
    })

    it('should include layer server directories when local scanning enabled', async () => {
      const { shouldScanLocalFiles } = await import('../../../src/nitro/setup/scanner')
      vi.mocked(shouldScanLocalFiles).mockReturnValue(true)

      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nuxt' },
          graphql: {
            layerServerDirs: ['/project/layers/base/server'],
            layerAppDirs: [],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nuxt',
          serverDir: '/project/server/graphql',
          clientDir: '/project/app/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/layers/base/server/graphql')
    })

    it('should not include layer server directories when local scanning disabled', async () => {
      const { shouldScanLocalFiles } = await import('../../../src/nitro/setup/scanner')
      vi.mocked(shouldScanLocalFiles).mockReturnValue(false)

      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nuxt' },
          graphql: {
            layerServerDirs: ['/project/layers/base/server'],
            layerAppDirs: [],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nuxt',
          serverDir: '/project/server/graphql',
          clientDir: '/project/app/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).not.toContain('/project/layers/base/server/graphql')
    })

    it('should include layer app directories', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nuxt' },
          graphql: {
            layerServerDirs: [],
            layerAppDirs: ['/project/layers/base/app'],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nuxt',
          serverDir: '/project/server/graphql',
          clientDir: '/project/app/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/layers/base/app/graphql')
    })
  })

  describe('unknown framework (fallback)', () => {
    it('should include client directory for unknown framework', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'unknown' },
          graphql: {},
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/graphql')
    })

    it('should include server directory when local scanning enabled', async () => {
      const { shouldScanLocalFiles } = await import('../../../src/nitro/setup/scanner')
      vi.mocked(shouldScanLocalFiles).mockReturnValue(true)

      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'unknown' },
          graphql: {},
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/server/graphql')
    })
  })

  describe('extend directories', () => {
    it('should include extend directories', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {},
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const extendDirs = ['/packages/shared/graphql']
      const dirs = getWatchDirectories(nitro, extendDirs)

      expect(dirs).toContain('/packages/shared/graphql')
    })

    it('should not duplicate directories that already exist', async () => {
      const { shouldScanLocalFiles } = await import('../../../src/nitro/setup/scanner')
      vi.mocked(shouldScanLocalFiles).mockReturnValue(true)

      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {},
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const extendDirs = ['/project/server/graphql']
      const dirs = getWatchDirectories(nitro, extendDirs)

      const serverGraphqlCount = dirs.filter(d => d === '/project/server/graphql').length
      expect(serverGraphqlCount).toBe(1)
    })
  })

  describe('external services', () => {
    it('should include external service document directories', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {
            externalServices: [
              {
                name: 'github',
                schema: 'https://api.github.com/graphql',
                endpoint: 'https://api.github.com/graphql',
                documents: ['app/graphql/github/**/*.graphql'],
              },
            ],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/app/graphql/github')
    })

    it('should handle multiple external services', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {
            externalServices: [
              {
                name: 'github',
                schema: 'https://api.github.com/graphql',
                endpoint: 'https://api.github.com/graphql',
                documents: ['app/graphql/github/**/*.graphql'],
              },
              {
                name: 'stripe',
                schema: 'https://api.stripe.com/graphql',
                endpoint: 'https://api.stripe.com/graphql',
                documents: ['app/graphql/stripe/**/*.graphql'],
              },
            ],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/app/graphql/github')
      expect(dirs).toContain('/project/app/graphql/stripe')
    })

    it('should not duplicate external service directories', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {
            externalServices: [
              {
                name: 'github',
                schema: 'https://api.github.com/graphql',
                endpoint: 'https://api.github.com/graphql',
                documents: [
                  'app/graphql/github/**/*.graphql',
                  'app/graphql/github/**/*.gql',
                ],
              },
            ],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      const githubDirCount = dirs.filter(d => d === '/project/app/graphql/github').length
      expect(githubDirCount).toBe(1)
    })

    it('should handle external services without documents', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {
            externalServices: [
              {
                name: 'github',
                schema: 'https://api.github.com/graphql',
                endpoint: 'https://api.github.com/graphql',
              },
            ],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      // Should not throw
      const dirs = getWatchDirectories(nitro)

      expect(dirs).toBeDefined()
    })

    it('should skip empty document patterns', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {
            externalServices: [
              {
                name: 'github',
                schema: 'https://api.github.com/graphql',
                endpoint: 'https://api.github.com/graphql',
                documents: ['', 'app/graphql/github/**/*.graphql'],
              },
            ],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(dirs).toContain('/project/app/graphql/github')
      expect(dirs).not.toContain('/project')
    })

    it('should handle document patterns without glob', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {
            externalServices: [
              {
                name: 'github',
                schema: 'https://api.github.com/graphql',
                endpoint: 'https://api.github.com/graphql',
                documents: ['app/graphql/github/queries.graphql'],
              },
            ],
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      // When there's no ** glob, it should just use the base path
      expect(dirs.some(d => d.includes('github'))).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle empty extend directories', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          graphql: {},
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro, [])

      expect(Array.isArray(dirs)).toBe(true)
    })

    it('should handle undefined graphql options', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nitro' },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nitro',
          serverDir: '/project/server/graphql',
          clientDir: '/project/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(Array.isArray(dirs)).toBe(true)
    })

    it('should handle undefined layer directories', () => {
      const nitro = createMockNitro({
        options: {
          rootDir: '/project',
          dev: true,
          framework: { name: 'nuxt' },
          graphql: {
            // layerServerDirs and layerAppDirs are undefined
          },
          ignore: [],
        } as any,
        graphql: {
          buildDir: '/project/.nuxt',
          serverDir: '/project/server/graphql',
          clientDir: '/project/app/graphql',
        } as any,
      })

      const dirs = getWatchDirectories(nitro)

      expect(Array.isArray(dirs)).toBe(true)
    })
  })
})

describe('constants used in file-watcher', () => {
  describe('gRAPHQL_EXTENSIONS', () => {
    it('should include .graphql extension', () => {
      expect(GRAPHQL_EXTENSIONS).toContain('.graphql')
    })

    it('should include .gql extension', () => {
      expect(GRAPHQL_EXTENSIONS).toContain('.gql')
    })
  })

  describe('rESOLVER_EXTENSIONS', () => {
    it('should include .resolver.ts extension', () => {
      expect(RESOLVER_EXTENSIONS).toContain('.resolver.ts')
    })

    it('should include .resolver.js extension', () => {
      expect(RESOLVER_EXTENSIONS).toContain('.resolver.js')
    })
  })

  describe('dIRECTIVE_EXTENSIONS', () => {
    it('should include .directive.ts extension', () => {
      expect(DIRECTIVE_EXTENSIONS).toContain('.directive.ts')
    })

    it('should include .directive.js extension', () => {
      expect(DIRECTIVE_EXTENSIONS).toContain('.directive.js')
    })
  })

  describe('dIR_SERVER_GRAPHQL', () => {
    it('should be server/graphql', () => {
      expect(DIR_SERVER_GRAPHQL).toBe('server/graphql')
    })
  })

  describe('dIR_SERVER_GRAPHQL_WIN', () => {
    it('should be server\\graphql for Windows', () => {
      expect(DIR_SERVER_GRAPHQL_WIN).toBe('server\\graphql')
    })
  })
})
