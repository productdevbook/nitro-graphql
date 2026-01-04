/**
 * Unit tests for defineGraphQLConfig function
 *
 * Tests the defineGraphQLConfig function which:
 * - Accepts partial server configuration
 * - Supports GraphQL Yoga and Apollo Server configs
 * - Returns the same config with type preservation
 */
import { describe, expect, it, vi } from 'vitest'
import { defineGraphQLConfig } from '../../../src/define'

describe('defineGraphQLConfig', () => {
  describe('basic functionality', () => {
    it('should return the same config object', () => {
      const config = {
        context: async () => ({}),
      }

      const result = defineGraphQLConfig(config)

      expect(result).toEqual(config)
    })

    it('should handle empty config', () => {
      const result = defineGraphQLConfig({})

      expect(result).toEqual({})
    })

    it('should preserve all config properties', () => {
      const config = {
        context: async () => ({ user: null }),
        graphiql: true,
        maskedErrors: { maskError: () => new Error('Masked') },
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.context).toBe(config.context)
      expect(result.graphiql).toBe(true)
      expect(result.maskedErrors).toBe(config.maskedErrors)
    })
  })

  describe('context configuration', () => {
    it('should accept sync context function', () => {
      const contextFn = () => ({ db: 'connection' })
      const config = { context: contextFn }

      const result = defineGraphQLConfig(config as any)

      expect(result.context).toBe(contextFn)
    })

    it('should accept async context function', () => {
      const contextFn = async () => {
        await Promise.resolve()
        return { user: { id: 1 } }
      }
      const config = { context: contextFn }

      const result = defineGraphQLConfig(config as any)

      expect(result.context).toBe(contextFn)
    })

    it('should accept context with event parameter', async () => {
      const contextFn = async (event: any) => ({
        user: event.context?.user || null,
        headers: event.headers,
      })
      const config = { context: contextFn }

      const result = defineGraphQLConfig(config as any)

      const mockEvent = { context: { user: { id: 1 } }, headers: {} }
      const ctx = await (result.context as Function)(mockEvent)

      expect(ctx.user).toEqual({ id: 1 })
    })
  })

  describe('graphQL Yoga configuration', () => {
    it('should accept graphiql option', () => {
      const config = { graphiql: true }

      const result = defineGraphQLConfig(config as any)

      expect(result.graphiql).toBe(true)
    })

    it('should accept graphiql with custom options', () => {
      const config = {
        graphiql: {
          defaultQuery: 'query { hello }',
        },
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.graphiql).toEqual({ defaultQuery: 'query { hello }' })
    })

    it('should accept maskedErrors configuration', () => {
      const maskError = vi.fn(() => new Error('Internal error'))
      const config = {
        maskedErrors: {
          maskError,
        },
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.maskedErrors).toBeDefined()
      expect((result.maskedErrors as any).maskError).toBe(maskError)
    })

    it('should accept plugins array', () => {
      const mockPlugin = { onExecute: vi.fn() }
      const config = {
        plugins: [mockPlugin],
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.plugins).toHaveLength(1)
      expect(result.plugins![0]).toBe(mockPlugin)
    })
  })

  describe('apollo Server configuration', () => {
    it('should accept apollo configuration object', () => {
      const config = {
        apollo: {
          introspection: true,
          csrfPrevention: true,
        },
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.apollo).toEqual({
        introspection: true,
        csrfPrevention: true,
      })
    })

    it('should accept apollo plugins', () => {
      const mockPlugin = { serverWillStart: vi.fn() }
      const config = {
        apollo: {
          plugins: [mockPlugin],
        },
      }

      const result = defineGraphQLConfig(config as any)

      expect((result.apollo as any).plugins).toContain(mockPlugin)
    })
  })

  describe('schema configuration', () => {
    it('should accept schema options', () => {
      const config = {
        schema: {
          resolverValidationOptions: {
            requireResolversForResolveType: 'ignore' as const,
          },
        },
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.schema).toEqual(config.schema)
    })
  })

  describe('type preservation', () => {
    it('should preserve function references', () => {
      const contextFn = async () => ({})
      const maskError = () => new Error()
      const config = {
        context: contextFn,
        maskedErrors: { maskError },
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.context).toBe(contextFn)
      expect((result.maskedErrors as any).maskError).toBe(maskError)
    })

    it('should preserve nested object structure', () => {
      const config = {
        apollo: {
          introspection: true,
          plugins: [],
          formatError: (error: any) => error,
        },
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.apollo).toBe(config.apollo)
    })
  })

  describe('edge cases', () => {
    it('should handle config with undefined values', () => {
      const config = {
        context: undefined,
        graphiql: undefined,
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.context).toBeUndefined()
      expect(result.graphiql).toBeUndefined()
    })

    it('should handle config with null values', () => {
      const config = {
        context: null,
      }

      const result = defineGraphQLConfig(config as any)

      expect(result.context).toBeNull()
    })

    it('should handle deeply nested configuration', () => {
      const config = {
        apollo: {
          plugins: [
            {
              requestDidStart: async () => ({
                willSendResponse: async () => {},
                didEncounterErrors: async () => {},
              }),
            },
          ],
        },
      }

      const result = defineGraphQLConfig(config as any)

      expect((result.apollo as any).plugins[0]).toBe(config.apollo.plugins[0])
    })
  })
})
