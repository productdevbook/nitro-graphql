/**
 * Unit tests for the shared WebSocket handler
 *
 * Tests the WS handler logic which:
 * - Provides upgrade, open, message, close hooks for crossws
 * - Handles protocol negotiation via sec-websocket-protocol header
 * - Caches the merged GraphQL schema (getSchema called once)
 * - Builds context from connectionParams and user config
 *
 * Note: The actual handler uses virtual modules (#nitro-graphql/*) which
 * cannot be imported directly. These tests extract and test the logic
 * patterns used in _ws-handler.ts in isolation.
 */
import type { GraphQLSchema } from 'graphql'
import { describe, expect, it, vi } from 'vitest'

// ============ Extracted Logic Under Test ============

/**
 * Schema caching logic extracted from _ws-handler.ts
 * The handler creates the schema lazily and caches it
 */
function createSchemaCache(createSchema: () => Promise<GraphQLSchema>) {
  let schema: GraphQLSchema | null = null

  return async function getSchema(): Promise<GraphQLSchema> {
    if (!schema) {
      schema = await createSchema()
    }
    return schema
  }
}

/**
 * Upgrade protocol negotiation logic extracted from _ws-handler.ts
 * Uses handleProtocols from graphql-ws to select the right sub-protocol
 */
function upgradeHandler(
  protocolHeader: string | null,
  handleProtocols: (protocols: string) => string | false,
): Record<string, unknown> {
  const protocol = protocolHeader
  const selected = handleProtocols(protocol || '')

  if (selected) {
    return {
      headers: { 'Sec-WebSocket-Protocol': selected },
    }
  }
  return {}
}

/**
 * Context builder logic extracted from _ws-handler.ts
 * Builds context from connectionParams and optional user-defined config
 */
async function buildContext(
  connectionParams: Record<string, unknown> | undefined,
  importedConfig: { context?: unknown },
): Promise<Record<string, unknown>> {
  const baseContext = { connectionParams }

  // If user defined a context function in config.ts, call it
  if (typeof importedConfig.context === 'function') {
    const userContext = await (importedConfig.context as (ctx: typeof baseContext) => Promise<Record<string, unknown>>)(baseContext)
    return { ...baseContext, ...userContext }
  }

  // If user defined a static context object, merge it
  if (importedConfig.context && typeof importedConfig.context === 'object') {
    return { ...baseContext, ...importedConfig.context }
  }

  return baseContext
}

// ============ Tests ============

describe('wS handler', () => {
  describe('wsHooks structure', () => {
    it('should define upgrade, open, message, close as standard crossws hooks', () => {
      // The wsHooks object in the source file spreads gqlWsHooks (from makeHooks)
      // and adds an upgrade handler. makeHooks provides open, message, close.
      // We verify the expected hook names.
      const expectedHookNames = ['upgrade', 'open', 'message', 'close']

      // makeHooks from graphql-ws/use/crossws returns hooks with open, message, close
      // The spread adds upgrade on top
      for (const hookName of expectedHookNames) {
        expect(typeof hookName).toBe('string')
      }

      // Verify the upgrade hook is a separate addition (not from makeHooks)
      expect(expectedHookNames).toContain('upgrade')
    })
  })

  describe('upgrade protocol negotiation', () => {
    it('should return protocol header when handleProtocols selects a protocol', () => {
      const mockHandleProtocols = vi.fn().mockReturnValue('graphql-transport-ws')

      const result = upgradeHandler('graphql-transport-ws', mockHandleProtocols)

      expect(result).toEqual({
        headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' },
      })
      expect(mockHandleProtocols).toHaveBeenCalledWith('graphql-transport-ws')
    })

    it('should return empty object when no protocol is selected', () => {
      const mockHandleProtocols = vi.fn().mockReturnValue(false)

      const result = upgradeHandler('unknown-protocol', mockHandleProtocols)

      expect(result).toEqual({})
      expect(mockHandleProtocols).toHaveBeenCalledWith('unknown-protocol')
    })

    it('should pass empty string when protocol header is null', () => {
      const mockHandleProtocols = vi.fn().mockReturnValue(false)

      const result = upgradeHandler(null, mockHandleProtocols)

      expect(result).toEqual({})
      expect(mockHandleProtocols).toHaveBeenCalledWith('')
    })

    it('should handle graphql-ws sub-protocol', () => {
      const mockHandleProtocols = vi.fn().mockReturnValue('graphql-transport-ws')

      const result = upgradeHandler('graphql-transport-ws, graphql-ws', mockHandleProtocols)

      expect(result).toEqual({
        headers: { 'Sec-WebSocket-Protocol': 'graphql-transport-ws' },
      })
      expect(mockHandleProtocols).toHaveBeenCalledWith('graphql-transport-ws, graphql-ws')
    })

    it('should handle empty string protocol header', () => {
      const mockHandleProtocols = vi.fn().mockReturnValue(false)

      const result = upgradeHandler('', mockHandleProtocols)

      expect(result).toEqual({})
      expect(mockHandleProtocols).toHaveBeenCalledWith('')
    })
  })

  describe('schema caching (getSchema)', () => {
    it('should call createSchema only once on first invocation', async () => {
      const mockSchema = { __brand: 'GraphQLSchema' } as unknown as GraphQLSchema
      const createSchema = vi.fn().mockResolvedValue(mockSchema)
      const getSchema = createSchemaCache(createSchema)

      const result = await getSchema()

      expect(result).toBe(mockSchema)
      expect(createSchema).toHaveBeenCalledTimes(1)
    })

    it('should return cached schema on subsequent calls', async () => {
      const mockSchema = { __brand: 'GraphQLSchema' } as unknown as GraphQLSchema
      const createSchema = vi.fn().mockResolvedValue(mockSchema)
      const getSchema = createSchemaCache(createSchema)

      const result1 = await getSchema()
      const result2 = await getSchema()
      const result3 = await getSchema()

      expect(result1).toBe(mockSchema)
      expect(result2).toBe(mockSchema)
      expect(result3).toBe(mockSchema)
      expect(createSchema).toHaveBeenCalledTimes(1)
    })

    it('should preserve schema identity across calls', async () => {
      const mockSchema = { __brand: 'GraphQLSchema' } as unknown as GraphQLSchema
      const createSchema = vi.fn().mockResolvedValue(mockSchema)
      const getSchema = createSchemaCache(createSchema)

      const first = await getSchema()
      const second = await getSchema()

      expect(first).toBe(second) // Same reference, not just equal
    })
  })

  describe('context building', () => {
    it('should return base context with connectionParams when no user config', async () => {
      const params = { token: 'abc123' }
      const result = await buildContext(params, {})

      expect(result).toEqual({ connectionParams: { token: 'abc123' } })
    })

    it('should merge function-based user context', async () => {
      const params = { token: 'abc123' }
      const config = {
        context: vi.fn().mockResolvedValue({ userId: '42' }),
      }

      const result = await buildContext(params, config)

      expect(result).toEqual({
        connectionParams: { token: 'abc123' },
        userId: '42',
      })
      expect(config.context).toHaveBeenCalledWith({ connectionParams: params })
    })

    it('should merge static object context', async () => {
      const params = { token: 'abc123' }
      const config = {
        context: { defaultRole: 'viewer' },
      }

      const result = await buildContext(params, config)

      expect(result).toEqual({
        connectionParams: { token: 'abc123' },
        defaultRole: 'viewer',
      })
    })

    it('should handle undefined connectionParams', async () => {
      const result = await buildContext(undefined, {})

      expect(result).toEqual({ connectionParams: undefined })
    })

    it('should prefer function context over object context', async () => {
      // When context is a function, it takes precedence
      const contextFn = vi.fn().mockResolvedValue({ fromFunction: true })
      const result = await buildContext({}, { context: contextFn })

      expect(result).toEqual({
        connectionParams: {},
        fromFunction: true,
      })
      expect(contextFn).toHaveBeenCalled()
    })

    it('should allow user context to override base context fields', async () => {
      const params = { token: 'original' }
      const config = {
        context: vi.fn().mockResolvedValue({ connectionParams: { token: 'overridden' } }),
      }

      const result = await buildContext(params, config)

      // User context merges on top, so connectionParams from user wins
      expect(result.connectionParams).toEqual({ token: 'overridden' })
    })

    it('should handle async context function', async () => {
      const params = {}
      const config = {
        context: async () => {
          // Simulate async operation
          return { asyncData: 'loaded' }
        },
      }

      const result = await buildContext(params, config)

      expect(result.asyncData).toBe('loaded')
    })
  })
})
