/**
 * Integration tests for GraphQL Subscriptions
 *
 * Tests that subscription functionality is properly set up:
 * - WebSocket route registration
 * - Subscription type detection in schema
 * - Codegen includes subscription operations
 */
import type { Nitro } from 'nitro/types'
import { createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'
import { scanResolversCore, scanSchemasCore } from '../../src/core/scanning'
import { createScanContextFromNitro } from '../../src/nitro/adapter'

const fixturesDir = resolve(__dirname, '../fixtures')

describe('graphQL Subscriptions Integration', () => {
  describe('subscription routes', () => {
    let nitro: Nitro

    beforeAll(async () => {
      nitro = await createNitro({
        rootDir: resolve(fixturesDir, 'subscription-project'),
        dev: true,
        modules: [
          graphql({
            framework: 'graphql-yoga',
            subscriptions: { enabled: true },
            types: { enabled: false },
          }),
        ],
      })
      await prepare(nitro)
    }, 30000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should register WebSocket upgrade handler', () => {
      const wsHandler = nitro.options.handlers.find(
        h => h.route === '/api/graphql/ws',
      )

      expect(wsHandler).toBeDefined()
      expect(wsHandler?.handler).toContain('graphql-yoga-ws')
    })

    it('should register standard GraphQL endpoint', () => {
      const graphqlHandler = nitro.options.handlers.find(
        h => h.route === '/api/graphql' && h.method === 'POST',
      )

      expect(graphqlHandler).toBeDefined()
    })
  })

  describe('subscription schema detection', () => {
    let nitro: Nitro

    beforeAll(async () => {
      nitro = await createNitro({
        rootDir: resolve(fixturesDir, 'subscription-project'),
        dev: true,
        modules: [
          graphql({
            framework: 'graphql-yoga',
            subscriptions: { enabled: true },
            types: { enabled: false },
          }),
        ],
      })
      await prepare(nitro)
    }, 30000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should detect subscription resolvers', async () => {
      const result = await scanResolversCore(createScanContextFromNitro(nitro))

      const subscriptionResolver = result.items.find(
        item => item.specifier.includes('chat.resolver'),
      )

      expect(subscriptionResolver).toBeDefined()

      // Check that chatSubscriptions is in imports
      const hasSubscription = subscriptionResolver?.imports.some(
        imp => imp.name === 'chatSubscriptions' && imp.type === 'subscription',
      )
      expect(hasSubscription).toBe(true)
    })

    it('should scan schema with subscription type', async () => {
      const result = await scanSchemasCore(createScanContextFromNitro(nitro))

      expect(result.items.length).toBeGreaterThan(0)

      // Items are file paths (strings)
      const schemaPath = result.items.find(
        path => path.includes('schema.graphql'),
      )
      expect(schemaPath).toBeDefined()
    })
  })

  describe('apollo Server subscriptions', () => {
    let nitro: Nitro

    beforeAll(async () => {
      nitro = await createNitro({
        rootDir: resolve(fixturesDir, 'subscription-project'),
        dev: true,
        modules: [
          graphql({
            framework: 'apollo-server',
            subscriptions: { enabled: true },
            types: { enabled: false },
          }),
        ],
      })
      await prepare(nitro)
    }, 30000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should register Apollo WebSocket handler', () => {
      const wsHandler = nitro.options.handlers.find(
        h => h.route === '/api/graphql/ws',
      )

      expect(wsHandler).toBeDefined()
      expect(wsHandler?.handler).toContain('apollo-server-ws')
    })
  })

  describe('subscriptions disabled', () => {
    let nitro: Nitro

    beforeAll(async () => {
      nitro = await createNitro({
        rootDir: resolve(fixturesDir, 'subscription-project'),
        dev: true,
        modules: [
          graphql({
            framework: 'graphql-yoga',
            subscriptions: { enabled: false },
            types: { enabled: false },
          }),
        ],
      })
      await prepare(nitro)
    }, 30000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should NOT register WebSocket handler when disabled', () => {
      const wsHandler = nitro.options.handlers.find(
        h => h.route === '/api/graphql/ws',
      )

      expect(wsHandler).toBeUndefined()
    })
  })

  describe('custom WebSocket endpoint', () => {
    let nitro: Nitro

    beforeAll(async () => {
      nitro = await createNitro({
        rootDir: resolve(fixturesDir, 'subscription-project'),
        dev: true,
        runtimeConfig: {
          graphql: {
            endpoint: {
              graphql: '/graphql',
              websocket: '/graphql/ws',
            },
          },
        },
        modules: [
          graphql({
            framework: 'graphql-yoga',
            subscriptions: { enabled: true },
            types: { enabled: false },
          }),
        ],
      })
      await prepare(nitro)
    }, 30000)

    afterAll(async () => {
      await nitro?.close()
    })

    it('should use custom WebSocket endpoint', () => {
      const wsHandler = nitro.options.handlers.find(
        h => h.route === '/graphql/ws',
      )

      expect(wsHandler).toBeDefined()
    })
  })
})
