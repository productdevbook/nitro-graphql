/**
 * Integration tests for route handler registration
 *
 * Tests that GraphQL route handlers are properly registered:
 * - GraphQL endpoint (GET/POST)
 * - Health check endpoint
 * - Debug endpoint (dev only)
 */
import type { Nitro } from 'nitro/types'
import { createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'
import { ENDPOINT_DEBUG, GRAPHQL_HTTP_METHODS } from '../../src/core/constants'

const fixturesDir = resolve(__dirname, '../fixtures')

describe('route handlers integration', () => {
  describe('graphQL Yoga routes', () => {
    let nitro: Nitro

    beforeAll(async () => {
      nitro = await createNitro({
        rootDir: resolve(fixturesDir, 'main-project'),
        dev: true,
        modules: [
          graphql({
            framework: 'graphql-yoga',
            types: { enabled: false },
          }),
        ],
      })
      await prepare(nitro)
    }, 30000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should register GraphQL endpoint handlers', () => {
      const graphqlHandlers = nitro.options.handlers.filter(
        h => h.route === '/api/graphql',
      )

      expect(graphqlHandlers.length).toBeGreaterThanOrEqual(GRAPHQL_HTTP_METHODS.length)
    })

    it('should register GET and POST methods for GraphQL', () => {
      const methods = nitro.options.handlers
        .filter(h => h.route === '/api/graphql')
        .map(h => h.method)

      expect(methods).toContain('GET')
      expect(methods).toContain('POST')
    })

    it('should register health check endpoint', () => {
      const healthHandler = nitro.options.handlers.find(
        h => h.route === '/api/graphql/health',
      )

      expect(healthHandler).toBeDefined()
      expect(healthHandler?.method).toBe('GET')
    })

    it('should register debug endpoint in development', () => {
      const debugHandler = nitro.options.handlers.find(
        h => h.route === ENDPOINT_DEBUG,
      )

      expect(debugHandler).toBeDefined()
      expect(debugHandler?.method).toBe('GET')
    })

    it('should use graphql-yoga handler files', () => {
      const graphqlHandler = nitro.options.handlers.find(
        h => h.route === '/api/graphql',
      )

      expect(graphqlHandler?.handler).toContain('graphql-yoga')
    })
  })

  describe('apollo Server routes', () => {
    let nitro: Nitro

    beforeAll(async () => {
      nitro = await createNitro({
        rootDir: resolve(fixturesDir, 'main-project'),
        dev: false,
        modules: [
          graphql({
            framework: 'apollo-server',
            types: { enabled: false },
          }),
        ],
      })
      await prepare(nitro)
    }, 30000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should register Apollo Server handlers', () => {
      const graphqlHandler = nitro.options.handlers.find(
        h => h.route === '/api/graphql',
      )

      expect(graphqlHandler?.handler).toContain('apollo-server')
    })

    it('should NOT register debug endpoint in production', () => {
      const debugHandler = nitro.options.handlers.find(
        h => h.route === ENDPOINT_DEBUG,
      )

      expect(debugHandler).toBeUndefined()
    })
  })

  describe('custom endpoints', () => {
    let nitro: Nitro

    beforeAll(async () => {
      nitro = await createNitro({
        rootDir: resolve(fixturesDir, 'main-project'),
        dev: true,
        runtimeConfig: {
          graphql: {
            endpoint: {
              graphql: '/graphql',
              healthCheck: '/health',
            },
          },
        },
        modules: [
          graphql({
            framework: 'graphql-yoga',
            types: { enabled: false },
          }),
        ],
      })
      await prepare(nitro)
    }, 30000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should use custom GraphQL endpoint', () => {
      const graphqlHandler = nitro.options.handlers.find(
        h => h.route === '/graphql',
      )

      expect(graphqlHandler).toBeDefined()
    })

    it('should use custom health check endpoint', () => {
      const healthHandler = nitro.options.handlers.find(
        h => h.route === '/health',
      )

      expect(healthHandler).toBeDefined()
    })
  })
})
