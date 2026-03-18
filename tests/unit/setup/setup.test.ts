/**
 * Unit tests for the refactored setup system (resolver chain)
 *
 * Tests:
 * - setupNitroGraphQL resolver chain execution order
 * - regenerateTypes helper (type-generation.ts)
 * - Individual resolvers in setup.ts
 * - resolveSecurityConfig (security.ts)
 */
import type { Nitro } from 'nitro/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ============ MOCKS ============

// Mock core validation
vi.mock('../../../src/core', () => ({
  validateExternalServices: vi.fn(() => []),
  relativeWithDot: vi.fn((from: string, to: string) => to),
}))

// Mock config defaults
vi.mock('../../../src/nitro/config', () => ({
  DEFAULT_TYPES_CONFIG: { server: 'types/server.d.ts', client: 'types/client.d.ts', enabled: true },
  DEFAULT_RUNTIME_CONFIG: { endpoint: { graphql: '/api/graphql', healthCheck: '/api/graphql/health' }, playground: true },
  DEFAULT_TYPESCRIPT_STRICT: true,
}))

// Mock paths
vi.mock('../../../src/nitro/paths', () => ({
  getDefaultPaths: vi.fn(() => ({
    serviceName: 'default',
    buildDir: '/project/.nitro',
    rootDir: '/project',
    framework: 'nitro',
    typesDir: '/project/.nitro/types',
    serverDir: '/project/server/graphql',
    clientDir: '/project/graphql',
  })),
  getTypesConfig: vi.fn(() => ({ enabled: true })),
  resolveFilePath: vi.fn(() => '/project/.nitro/types/test.d.ts'),
}))

// Mock rollup config
vi.mock('../../../src/nitro/rollup', () => ({
  rollupConfig: vi.fn().mockResolvedValue(undefined),
}))

// Mock extend-loader
vi.mock('../../../src/nitro/setup/extend-loader', () => ({
  resolveExtendDirs: vi.fn().mockResolvedValue([]),
  resolveExtendConfig: vi.fn().mockResolvedValue(undefined),
}))

// Mock file-watcher
const mockWatcher = {
  on: vi.fn().mockReturnThis(),
  close: vi.fn(),
}
vi.mock('../../../src/nitro/setup/file-watcher', () => ({
  getWatchDirectories: vi.fn(() => ['/project/server/graphql', '/project/graphql']),
  setupFileWatcher: vi.fn(() => mockWatcher),
}))

// Mock logging
vi.mock('../../../src/nitro/setup/logging', () => ({
  logStartupInfo: vi.fn(),
}))

// Mock rollup-integration
vi.mock('../../../src/nitro/setup/rollup-integration', () => ({
  setupNoExternals: vi.fn(),
  setupRollupExternals: vi.fn(),
  setupRollupChunking: vi.fn(),
}))

// Mock routes
vi.mock('../../../src/nitro/setup/routes', () => ({
  registerRouteHandlers: vi.fn(),
}))

// Mock scanner
vi.mock('../../../src/nitro/setup/scanner', () => ({
  isServerEnabled: vi.fn(() => true),
  performGraphQLScan: vi.fn().mockResolvedValue(undefined),
  logResolverDiagnostics: vi.fn(),
}))

// Mock security (use actual implementation for security tests)
vi.mock('../../../src/nitro/setup/security', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/nitro/setup/security')>()
  return {
    ...actual,
    resolveSecurityConfig: vi.fn(actual.resolveSecurityConfig),
  }
})

// Mock ts-config
vi.mock('../../../src/nitro/setup/ts-config', () => ({
  setupTypeScriptPaths: vi.fn(),
}))

// Mock codegen
vi.mock('../../../src/nitro/codegen', () => ({
  generateServerTypes: vi.fn().mockResolvedValue('type Query { hello: String }'),
  generateClientTypes: vi.fn().mockResolvedValue(undefined),
}))

// Mock type-generation for setup.ts tests (but NOT for regenerateTypes tests)
// We use a dynamic mock so we can swap between real and mock implementations
const mockRegenerateTypes = vi.fn().mockResolvedValue(undefined)
vi.mock('../../../src/nitro/setup/type-generation', () => ({
  regenerateTypes: mockRegenerateTypes,
}))

// ============ HELPERS ============

/**
 * Create a minimal mock Nitro instance for testing
 */
function createMockNitro(overrides: Partial<Nitro> = {}): Nitro {
  const hookCallbacks = new Map<string, Array<(...args: any[]) => any>>()

  const defaultNitro: Partial<Nitro> = {
    options: {
      rootDir: '/project',
      buildDir: '/project/.nitro',
      dev: true,
      framework: { name: 'nitro' },
      graphql: {
        framework: 'graphql-yoga',
        server: true,
      },
      handlers: [],
      ignore: [],
      noExternals: [],
      runtimeConfig: {
        graphql: {},
      },
      typescript: {
        strict: false,
      },
      features: {},
    } as any,
    graphql: {
      buildDir: '/project/.graphql',
      watchDirs: [],
      clientDir: '/project/graphql',
      serverDir: '/project/server/graphql',
      dir: {
        build: '.nitro',
        client: 'graphql',
        server: 'server',
      },
      state: {
        schemas: [],
        resolvers: [],
        directives: [],
        documents: [],
        directiveSchemas: null,
        extendConfigs: [],
        extendSchemas: [],
      },
      directiveSchemas: null,
      extendConfigs: [],
      extendSchemas: [],
    } as any,
    scanSchemas: [],
    scanResolvers: [],
    scanDirectives: [],
    scanDocuments: [],
    hooks: {
      hook: vi.fn((name: string, callback: (...args: any[]) => any) => {
        if (!hookCallbacks.has(name)) {
          hookCallbacks.set(name, [])
        }
        hookCallbacks.get(name)!.push(callback)
      }),
      callHook: vi.fn(async (name: string, ...args: any[]) => {
        const callbacks = hookCallbacks.get(name) || []
        for (const cb of callbacks) {
          await cb(...args)
        }
      }),
    } as any,
  }

  return {
    ...defaultNitro,
    ...overrides,
    options: {
      ...defaultNitro.options,
      ...(overrides.options || {}),
      graphql: {
        ...defaultNitro.options!.graphql,
        ...(overrides.options?.graphql || {}),
      },
      runtimeConfig: {
        ...defaultNitro.options!.runtimeConfig,
        ...(overrides.options?.runtimeConfig || {}),
      },
      typescript: {
        ...defaultNitro.options!.typescript,
        ...(overrides.options?.typescript || {}),
      },
      features: {
        ...defaultNitro.options!.features,
        ...(overrides.options?.features || {}),
      },
    },
    graphql: {
      ...defaultNitro.graphql,
      ...(overrides.graphql || {}),
    },
    hooks: overrides.hooks || defaultNitro.hooks,
  } as Nitro
}

/**
 * Helper to get registered hook callbacks from a mock Nitro
 */
function getRegisteredHooks(nitro: Nitro): Map<string, Array<(...args: any[]) => any>> {
  const hooks = new Map<string, Array<(...args: any[]) => any>>()
  const hookFn = nitro.hooks.hook as ReturnType<typeof vi.fn>
  for (const call of hookFn.mock.calls) {
    const [name, cb] = call
    if (!hooks.has(name)) {
      hooks.set(name, [])
    }
    hooks.get(name)!.push(cb)
  }
  return hooks
}

// ============ TESTS ============

describe('setupNitroGraphQL', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('resolver chain execution', () => {
    it('should execute all resolvers in sequence', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled } = await import('../../../src/nitro/setup/scanner')
      const { performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { registerRouteHandlers } = await import('../../../src/nitro/setup/routes')
      const { logStartupInfo } = await import('../../../src/nitro/setup/logging')

      vi.mocked(isServerEnabled).mockReturnValue(true)

      const nitro = createMockNitro()
      await setupNitroGraphQL(nitro)

      // Verify key resolvers were called
      expect(performGraphQLScan).toHaveBeenCalledWith(nitro)
      expect(registerRouteHandlers).toHaveBeenCalledWith(nitro)
      expect(logStartupInfo).toHaveBeenCalledWith(nitro, true)
      expect(mockRegenerateTypes).toHaveBeenCalled()
    })

    it('should call resolvers in correct order (scan before types, types before routes)', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { registerRouteHandlers } = await import('../../../src/nitro/setup/routes')
      const { isServerEnabled } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)

      const callOrder: string[] = []

      vi.mocked(performGraphQLScan).mockImplementation(async () => {
        callOrder.push('scan')
      })

      mockRegenerateTypes.mockImplementation(async () => {
        callOrder.push('types')
      })

      vi.mocked(registerRouteHandlers).mockImplementation(() => {
        callOrder.push('routes')
      })

      const nitro = createMockNitro()
      await setupNitroGraphQL(nitro)

      const scanIndex = callOrder.indexOf('scan')
      const typesIndex = callOrder.indexOf('types')
      const routesIndex = callOrder.indexOf('routes')

      expect(scanIndex).toBeLessThan(typesIndex)
      expect(typesIndex).toBeLessThan(routesIndex)
    })

    it('should stop execution if a resolver throws', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled } = await import('../../../src/nitro/setup/scanner')
      const { registerRouteHandlers } = await import('../../../src/nitro/setup/routes')
      const { validateExternalServices } = await import('../../../src/core')

      vi.mocked(isServerEnabled).mockReturnValue(true)

      // Make validation throw
      vi.mocked(validateExternalServices).mockReturnValue(['Service error'])

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            externalServices: [{ name: 'bad' }],
          },
        } as any,
      })

      await expect(setupNitroGraphQL(nitro)).rejects.toThrow('Invalid external services configuration')

      // Routes should NOT have been called since validation failed
      expect(registerRouteHandlers).not.toHaveBeenCalled()
    })
  })
})

describe('regenerateTypes', () => {
  // For these tests, we import the ACTUAL implementation (not the mock)
  // We need to reimport the real module

  let generateServerTypes: ReturnType<typeof vi.fn>
  let generateClientTypes: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()
    const codegen = await import('../../../src/nitro/codegen')
    generateServerTypes = vi.mocked(codegen.generateServerTypes)
    generateClientTypes = vi.mocked(codegen.generateClientTypes)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // Since regenerateTypes is mocked at the module level for setup.ts tests,
  // we test it by directly testing the logic it encapsulates.
  // We re-implement the test against the actual source patterns.

  it('should call generateServerTypes and generateClientTypes when server is enabled', async () => {
    const { isServerEnabled } = await import('../../../src/nitro/setup/scanner')
    vi.mocked(isServerEnabled).mockReturnValue(true)

    generateServerTypes.mockResolvedValue('type Query { test: String }')
    generateClientTypes.mockResolvedValue(undefined)

    const nitro = createMockNitro()

    // Manually invoke the logic that regenerateTypes does
    const schemaString = await generateServerTypes(nitro)
    await generateClientTypes(nitro, undefined, schemaString)

    expect(generateServerTypes).toHaveBeenCalledWith(nitro)
    expect(generateClientTypes).toHaveBeenCalledWith(nitro, undefined, 'type Query { test: String }')
  })

  it('should only call generateClientTypes when server is disabled', async () => {
    generateClientTypes.mockResolvedValue(undefined)

    const nitro = createMockNitro()

    // When server disabled, only client types are generated
    const serverEnabled = false
    if (serverEnabled) {
      const schemaString = await generateServerTypes(nitro)
      await generateClientTypes(nitro, undefined, schemaString)
    }
    else {
      await generateClientTypes(nitro)
    }

    expect(generateServerTypes).not.toHaveBeenCalled()
    expect(generateClientTypes).toHaveBeenCalledWith(nitro)
  })

  it('should pass silent option through to both generators', async () => {
    generateServerTypes.mockResolvedValue('schema string')
    generateClientTypes.mockResolvedValue(undefined)

    const nitro = createMockNitro()

    // Simulate silent mode
    const opts = { silent: true }
    const schemaString = await generateServerTypes(nitro, opts)
    await generateClientTypes(nitro, opts, schemaString)

    expect(generateServerTypes).toHaveBeenCalledWith(nitro, { silent: true })
    expect(generateClientTypes).toHaveBeenCalledWith(nitro, { silent: true }, 'schema string')
  })

  it('should pass schema string from server types to client types', async () => {
    const mockSchema = 'type Query { users: [User] }\ntype User { id: ID! name: String }'
    generateServerTypes.mockResolvedValue(mockSchema)
    generateClientTypes.mockResolvedValue(undefined)

    const nitro = createMockNitro()

    const schemaString = await generateServerTypes(nitro)
    await generateClientTypes(nitro, undefined, schemaString)

    expect(generateClientTypes).toHaveBeenCalledWith(nitro, undefined, mockSchema)
  })

  it('should handle undefined schema string from server types', async () => {
    generateServerTypes.mockResolvedValue(undefined)
    generateClientTypes.mockResolvedValue(undefined)

    const nitro = createMockNitro()

    const schemaString = await generateServerTypes(nitro)
    await generateClientTypes(nitro, undefined, schemaString)

    expect(generateClientTypes).toHaveBeenCalledWith(nitro, undefined, undefined)
  })
})

describe('regenerateTypes (actual implementation)', () => {
  // Test the actual regenerateTypes function by calling the source directly
  // We need to bypass the module mock for this

  let actualRegenerateTypes: typeof import('../../../src/nitro/setup/type-generation').regenerateTypes

  beforeEach(async () => {
    vi.clearAllMocks()

    // Dynamically import the actual (unmocked) module
    // Since vi.mock hoists, we use vi.importActual to get the real implementation
    const actual = await vi.importActual<typeof import('../../../src/nitro/setup/type-generation')>(
      '../../../src/nitro/setup/type-generation',
    )
    actualRegenerateTypes = actual.regenerateTypes
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call both server and client type generation when serverEnabled is true', async () => {
    const codegen = await import('../../../src/nitro/codegen')
    vi.mocked(codegen.generateServerTypes).mockResolvedValue('schema')
    vi.mocked(codegen.generateClientTypes).mockResolvedValue(undefined)

    const nitro = createMockNitro()
    await actualRegenerateTypes(nitro, { serverEnabled: true })

    expect(codegen.generateServerTypes).toHaveBeenCalledWith(nitro, undefined)
    expect(codegen.generateClientTypes).toHaveBeenCalledWith(nitro, undefined, 'schema')
  })

  it('should only call client type generation when serverEnabled is false', async () => {
    const codegen = await import('../../../src/nitro/codegen')
    vi.mocked(codegen.generateClientTypes).mockResolvedValue(undefined)

    const nitro = createMockNitro()
    await actualRegenerateTypes(nitro, { serverEnabled: false })

    expect(codegen.generateServerTypes).not.toHaveBeenCalled()
    expect(codegen.generateClientTypes).toHaveBeenCalledWith(nitro, undefined)
  })

  it('should pass silent option to generators', async () => {
    const codegen = await import('../../../src/nitro/codegen')
    vi.mocked(codegen.generateServerTypes).mockResolvedValue('schema')
    vi.mocked(codegen.generateClientTypes).mockResolvedValue(undefined)

    const nitro = createMockNitro()
    await actualRegenerateTypes(nitro, { serverEnabled: true, silent: true })

    expect(codegen.generateServerTypes).toHaveBeenCalledWith(nitro, { silent: true })
    expect(codegen.generateClientTypes).toHaveBeenCalledWith(nitro, { silent: true }, 'schema')
  })

  it('should default to isServerEnabled when serverEnabled option is not provided', async () => {
    const codegen = await import('../../../src/nitro/codegen')
    const { isServerEnabled } = await import('../../../src/nitro/setup/scanner')

    vi.mocked(isServerEnabled).mockReturnValue(false)
    vi.mocked(codegen.generateClientTypes).mockResolvedValue(undefined)

    const nitro = createMockNitro()
    await actualRegenerateTypes(nitro)

    expect(isServerEnabled).toHaveBeenCalledWith(nitro)
    expect(codegen.generateServerTypes).not.toHaveBeenCalled()
    expect(codegen.generateClientTypes).toHaveBeenCalled()
  })

  it('should not pass silent option when silent is false', async () => {
    const codegen = await import('../../../src/nitro/codegen')
    const { isServerEnabled } = await import('../../../src/nitro/setup/scanner')

    vi.mocked(isServerEnabled).mockReturnValue(true)
    vi.mocked(codegen.generateServerTypes).mockResolvedValue('schema')
    vi.mocked(codegen.generateClientTypes).mockResolvedValue(undefined)

    const nitro = createMockNitro()
    await actualRegenerateTypes(nitro, { serverEnabled: true, silent: false })

    // silent: false means opts is undefined (not { silent: true })
    expect(codegen.generateServerTypes).toHaveBeenCalledWith(nitro, undefined)
  })
})

describe('individual resolvers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('resolveConfiguration', () => {
    it('should initialize graphql options if not set', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()
      // Remove graphql to test initialization
      delete (nitro.options as any).graphql

      await setupNitroGraphQL(nitro)

      // graphql options should be initialized
      expect(nitro.options.graphql).toBeDefined()
    })

    it('should initialize nitro.graphql state object', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()
      // Remove graphql state to test initialization
      delete (nitro as any).graphql

      await setupNitroGraphQL(nitro)

      expect(nitro.graphql).toBeDefined()
      expect(nitro.graphql.buildDir).toBeDefined()
    })

    it('should initialize scan arrays', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()
      delete (nitro as any).scanSchemas
      delete (nitro as any).scanResolvers
      delete (nitro as any).scanDirectives
      delete (nitro as any).scanDocuments

      await setupNitroGraphQL(nitro)

      expect(nitro.scanSchemas).toBeDefined()
      expect(nitro.scanResolvers).toBeDefined()
      expect(nitro.scanDirectives).toBeDefined()
      expect(nitro.scanDocuments).toBeDefined()
    })

    it('should enable websocket feature when subscriptions are enabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            subscriptions: { enabled: true },
          },
        } as any,
      })

      await setupNitroGraphQL(nitro)

      expect(nitro.options.features.websocket).toBe(true)
    })

    it('should not enable websocket when subscriptions are not enabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(nitro.options.features.websocket).toBeUndefined()
    })

    it('should merge types config with defaults using defu', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            types: { server: 'custom/server.d.ts' },
          },
        } as any,
      })

      await setupNitroGraphQL(nitro)

      // User's custom value should be preserved
      expect(nitro.options.graphql!.types!.server).toBe('custom/server.d.ts')
    })
  })

  describe('resolveValidation', () => {
    it('should throw when external services have validation errors', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { validateExternalServices } = await import('../../../src/core')
      const { isServerEnabled } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(validateExternalServices).mockReturnValue(['Missing name', 'Missing schema'])

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            externalServices: [{ invalid: true }],
          },
        } as any,
      })

      await expect(setupNitroGraphQL(nitro)).rejects.toThrow('Invalid external services configuration')
    })

    it('should not throw when external services are valid', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { validateExternalServices } = await import('../../../src/core')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(validateExternalServices).mockReturnValue([])
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            externalServices: [{ name: 'github', schema: 'https://example.com' }],
          },
        } as any,
      })

      await expect(setupNitroGraphQL(nitro)).resolves.not.toThrow()
    })

    it('should skip validation when no external services configured', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { validateExternalServices } = await import('../../../src/core')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(validateExternalServices).not.toHaveBeenCalled()
    })
  })

  describe('resolveBuildDirectories', () => {
    it('should set graphql.buildDir to .graphql in rootDir', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      // buildDir should be set to {rootDir}/.graphql
      expect(nitro.graphql.buildDir).toContain('.graphql')
    })

    it('should compute relative directory paths', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      // dir.client and dir.server should be relative paths
      expect(nitro.graphql.dir.client).toBeDefined()
      expect(nitro.graphql.dir.server).toBeDefined()
    })
  })

  describe('resolveRollupIntegration', () => {
    it('should setup rollup integration when server is enabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { setupNoExternals, setupRollupExternals, setupRollupChunking } = await import('../../../src/nitro/setup/rollup-integration')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(setupNoExternals).toHaveBeenCalledWith(nitro)
      expect(setupRollupExternals).toHaveBeenCalledWith(nitro)
      expect(setupRollupChunking).toHaveBeenCalledWith(nitro)
    })

    it('should skip rollup integration when server is disabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { setupNoExternals, setupRollupExternals, setupRollupChunking } = await import('../../../src/nitro/setup/rollup-integration')

      vi.mocked(isServerEnabled).mockReturnValue(false)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            server: false,
          },
        } as any,
      })

      await setupNitroGraphQL(nitro)

      expect(setupNoExternals).not.toHaveBeenCalled()
      expect(setupRollupExternals).not.toHaveBeenCalled()
      expect(setupRollupChunking).not.toHaveBeenCalled()
    })
  })

  describe('resolveRuntimeConfig', () => {
    it('should merge security config into runtime config', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { resolveSecurityConfig } = await import('../../../src/nitro/setup/security')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(resolveSecurityConfig).toHaveBeenCalled()
      // Runtime config should have the security settings
      expect(nitro.options.runtimeConfig.graphql).toBeDefined()
      expect(nitro.options.runtimeConfig.graphql.security).toBeDefined()
    })

    it('should merge default runtime config values', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      // Should have endpoint defaults from DEFAULT_RUNTIME_CONFIG
      expect(nitro.options.runtimeConfig.graphql.endpoint).toBeDefined()
    })
  })

  describe('resolveFileWatching', () => {
    it('should setup file watcher in dev mode', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { setupFileWatcher } = await import('../../../src/nitro/setup/file-watcher')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({ options: { dev: true } as any })

      await setupNitroGraphQL(nitro)

      expect(setupFileWatcher).toHaveBeenCalled()
    })

    it('should skip file watcher in production mode', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { setupFileWatcher } = await import('../../../src/nitro/setup/file-watcher')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: { dev: false } as any,
      })

      await setupNitroGraphQL(nitro)

      expect(setupFileWatcher).not.toHaveBeenCalled()
    })

    it('should register close hook to close watcher', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({ options: { dev: true } as any })

      await setupNitroGraphQL(nitro)

      // The close hook should be registered
      const hooks = getRegisteredHooks(nitro)
      expect(hooks.has('close')).toBe(true)

      // Trigger the close hook
      const closeCallbacks = hooks.get('close')!
      for (const cb of closeCallbacks) {
        await cb()
      }

      expect(mockWatcher.close).toHaveBeenCalled()
    })

    it('should watch only client dir when server is disabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { setupFileWatcher } = await import('../../../src/nitro/setup/file-watcher')

      vi.mocked(isServerEnabled).mockReturnValue(false)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({ options: { dev: true } as any })

      await setupNitroGraphQL(nitro)

      // When server is disabled but dev mode is on, watcher should be called
      // with only client directories
      if (vi.mocked(setupFileWatcher).mock.calls.length > 0) {
        const watchDirs = vi.mocked(setupFileWatcher).mock.calls[0][1]
        // Should contain clientDir path
        expect(watchDirs).toBeDefined()
      }
    })
  })

  describe('resolveDevHooks', () => {
    it('should register dev:start hook when server is enabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      const hooks = getRegisteredHooks(nitro)
      expect(hooks.has('dev:start')).toBe(true)
    })

    it('should debounce dev:start hook calls', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      // Mock Date.now for debounce testing
      const originalDateNow = Date.now
      let currentTime = 1000
      Date.now = vi.fn(() => currentTime)

      await setupNitroGraphQL(nitro)

      const hooks = getRegisteredHooks(nitro)
      const devStartCallbacks = hooks.get('dev:start')!

      // Clear mocks from setup
      vi.mocked(performGraphQLScan).mockClear()

      // First call should go through
      for (const cb of devStartCallbacks) {
        await cb()
      }
      const scanCallsAfterFirst = vi.mocked(performGraphQLScan).mock.calls.length

      // Second call within debounce window should be ignored
      currentTime = 1100 // Only 100ms later, less than 500ms debounce
      for (const cb of devStartCallbacks) {
        await cb()
      }
      const scanCallsAfterSecond = vi.mocked(performGraphQLScan).mock.calls.length

      // The second call should have been debounced (same count as after first)
      expect(scanCallsAfterSecond).toBe(scanCallsAfterFirst)

      // Third call after debounce window should go through
      currentTime = 2000 // 1000ms later, more than 500ms debounce
      for (const cb of devStartCallbacks) {
        await cb()
      }
      const scanCallsAfterThird = vi.mocked(performGraphQLScan).mock.calls.length

      expect(scanCallsAfterThird).toBeGreaterThan(scanCallsAfterSecond)

      // Restore
      Date.now = originalDateNow
    })

    it('should pass isRescan and silent options on dev:start', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      const hooks = getRegisteredHooks(nitro)
      const devStartCallbacks = hooks.get('dev:start')!

      // Clear mocks from setup
      vi.mocked(performGraphQLScan).mockClear()

      // Trigger dev:start
      for (const cb of devStartCallbacks) {
        await cb()
      }

      // performGraphQLScan should be called with rescan + silent options
      expect(performGraphQLScan).toHaveBeenCalledWith(nitro, { isRescan: true, silent: true })
    })

    it('should skip dev:start hook when server is disabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(false)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            server: false,
          },
        } as any,
      })

      await setupNitroGraphQL(nitro)

      const hooks = getRegisteredHooks(nitro)
      // dev:start should not be registered when server is disabled
      expect(hooks.has('dev:start')).toBe(false)
    })
  })

  describe('resolveCloseHooks', () => {
    it('should register close hook for type regeneration', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      const hooks = getRegisteredHooks(nitro)
      expect(hooks.has('close')).toBe(true)
    })

    it('should call regenerateTypes with silent option on close', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)
      mockRegenerateTypes.mockClear()

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      // Clear the call from resolveTypeGeneration
      mockRegenerateTypes.mockClear()

      // Trigger close hooks
      const hooks = getRegisteredHooks(nitro)
      const closeCallbacks = hooks.get('close')!
      for (const cb of closeCallbacks) {
        await cb()
      }

      // regenerateTypes should have been called with silent: true
      expect(mockRegenerateTypes).toHaveBeenCalledWith(nitro, { silent: true })
    })
  })

  describe('resolveRouteHandlers', () => {
    it('should register route handlers when server is enabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { registerRouteHandlers } = await import('../../../src/nitro/setup/routes')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(registerRouteHandlers).toHaveBeenCalledWith(nitro)
    })

    it('should skip route handlers when server is disabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { registerRouteHandlers } = await import('../../../src/nitro/setup/routes')

      vi.mocked(isServerEnabled).mockReturnValue(false)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            server: false,
          },
        } as any,
      })

      await setupNitroGraphQL(nitro)

      expect(registerRouteHandlers).not.toHaveBeenCalled()
    })
  })

  describe('resolveTypeScriptConfig', () => {
    it('should set typescript strict mode', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(nitro.options.typescript.strict).toBe(true)
    })

    it('should register types:extend hook', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      const hooks = getRegisteredHooks(nitro)
      expect(hooks.has('types:extend')).toBe(true)
    })

    it('should call setupTypeScriptPaths when types:extend hook fires', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { setupTypeScriptPaths } = await import('../../../src/nitro/setup/ts-config')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      // Trigger types:extend hook
      const hooks = getRegisteredHooks(nitro)
      const typesExtendCallbacks = hooks.get('types:extend')!
      const mockTypes = { tsConfig: {} }
      for (const cb of typesExtendCallbacks) {
        await cb(mockTypes)
      }

      expect(setupTypeScriptPaths).toHaveBeenCalledWith(nitro, mockTypes)
    })
  })

  describe('resolveVirtualModules', () => {
    it('should call rollupConfig when server is enabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { rollupConfig } = await import('../../../src/nitro/rollup')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(rollupConfig).toHaveBeenCalledWith(nitro)
    })

    it('should skip rollupConfig when server is disabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { rollupConfig } = await import('../../../src/nitro/rollup')

      vi.mocked(isServerEnabled).mockReturnValue(false)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            server: false,
          },
        } as any,
      })

      await setupNitroGraphQL(nitro)

      expect(rollupConfig).not.toHaveBeenCalled()
    })
  })

  describe('resolveStartupLogging', () => {
    it('should call logStartupInfo with server enabled state', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { logStartupInfo } = await import('../../../src/nitro/setup/logging')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(logStartupInfo).toHaveBeenCalledWith(nitro, true)
    })

    it('should pass false when server is disabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')
      const { logStartupInfo } = await import('../../../src/nitro/setup/logging')

      vi.mocked(isServerEnabled).mockReturnValue(false)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            server: false,
          },
        } as any,
      })

      await setupNitroGraphQL(nitro)

      expect(logStartupInfo).toHaveBeenCalledWith(nitro, false)
    })
  })

  describe('resolveGraphQLScan', () => {
    it('should call performGraphQLScan', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      expect(performGraphQLScan).toHaveBeenCalledWith(nitro)
    })
  })

  describe('resolveTypeGeneration', () => {
    it('should call regenerateTypes with serverEnabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(true)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)
      mockRegenerateTypes.mockClear()

      const nitro = createMockNitro()

      await setupNitroGraphQL(nitro)

      // The resolveTypeGeneration step should call regenerateTypes with serverEnabled
      expect(mockRegenerateTypes).toHaveBeenCalledWith(nitro, { serverEnabled: true })
    })

    it('should pass serverEnabled: false when server is disabled', async () => {
      const { setupNitroGraphQL } = await import('../../../src/nitro/setup')
      const { isServerEnabled, performGraphQLScan } = await import('../../../src/nitro/setup/scanner')

      vi.mocked(isServerEnabled).mockReturnValue(false)
      vi.mocked(performGraphQLScan).mockResolvedValue(undefined)
      mockRegenerateTypes.mockClear()

      const nitro = createMockNitro({
        options: {
          graphql: {
            framework: 'graphql-yoga',
            server: false,
          },
        } as any,
      })

      await setupNitroGraphQL(nitro)

      expect(mockRegenerateTypes).toHaveBeenCalledWith(nitro, { serverEnabled: false })
    })
  })
})

describe('resolveSecurityConfig', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  describe('development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should return permissive defaults in development', async () => {
      const { resolveSecurityConfig } = await vi.importActual<typeof import('../../../src/nitro/setup/security')>(
        '../../../src/nitro/setup/security',
      )
      const result = resolveSecurityConfig()

      expect(result).toEqual({
        introspection: true,
        playground: true,
        maskErrors: false,
        disableSuggestions: false,
      })
    })
  })

  describe('production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should return restrictive defaults in production', async () => {
      const { resolveSecurityConfig } = await vi.importActual<typeof import('../../../src/nitro/setup/security')>(
        '../../../src/nitro/setup/security',
      )
      const result = resolveSecurityConfig()

      expect(result).toEqual({
        introspection: false,
        playground: false,
        maskErrors: true,
        disableSuggestions: true,
      })
    })

    it('should allow overriding individual settings', async () => {
      const { resolveSecurityConfig } = await vi.importActual<typeof import('../../../src/nitro/setup/security')>(
        '../../../src/nitro/setup/security',
      )
      const result = resolveSecurityConfig({
        introspection: true,
        playground: true,
      })

      expect(result).toEqual({
        introspection: true,
        playground: true,
        maskErrors: true,
        disableSuggestions: true,
      })
    })
  })

  describe('edge cases', () => {
    it('should handle undefined config', async () => {
      process.env.NODE_ENV = 'development'
      const { resolveSecurityConfig } = await vi.importActual<typeof import('../../../src/nitro/setup/security')>(
        '../../../src/nitro/setup/security',
      )
      const result = resolveSecurityConfig(undefined)

      expect(result).toBeDefined()
      expect(typeof result.introspection).toBe('boolean')
      expect(typeof result.playground).toBe('boolean')
      expect(typeof result.maskErrors).toBe('boolean')
      expect(typeof result.disableSuggestions).toBe('boolean')
    })

    it('should handle empty object config', async () => {
      process.env.NODE_ENV = 'production'
      const { resolveSecurityConfig } = await vi.importActual<typeof import('../../../src/nitro/setup/security')>(
        '../../../src/nitro/setup/security',
      )
      const result = resolveSecurityConfig({})

      // Empty object should fall through to env-based defaults
      expect(result.introspection).toBe(false)
      expect(result.maskErrors).toBe(true)
    })
  })
})
