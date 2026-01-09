/**
 * E2E tests for extend schema merging at GraphQL endpoint
 *
 * This test verifies that schemas from multiple extend directories
 * are properly merged and served at the /api/graphql endpoint.
 *
 * Scenario:
 * - User has `extend: ['./auth', './ecommerce']` with `skipLocalScan: true`
 * - Each extend directory has its own nitro-graphql.config.ts
 * - The merged schema should contain types from both packages
 */
import type { Nitro } from 'nitro/types'
import { build, createDevServer, createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')

function typeQuery(typeName: string) {
  return `query { __type(name: "${typeName}") { name fields { name } } }`
}

describe('extend Schema Merge E2E', () => {
  let nitro: Nitro
  let devServer: ReturnType<typeof createDevServer>
  let serverUrl: string

  beforeAll(async () => {
    nitro = await createNitro({
      rootDir: resolve(fixturesDir, 'extend-multi/main-project'),
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          skipLocalScan: true,
          extend: [
            resolve(fixturesDir, 'extend-multi/auth'),
            resolve(fixturesDir, 'extend-multi/ecommerce'),
          ],
          // Enable type generation so schema.graphql file is created
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    // BUG: After build(), the dev:start hook triggers performGraphQLScan
    // which clears and re-populates scanSchemas/scanResolvers.
    // During rescan with skipLocalScan:true, extend packages are NOT fully loaded.

    devServer = createDevServer(nitro)
    const server = await devServer.listen({ port: 0 })
    const url = server.url || `http://localhost:${(server as unknown as { port: number }).port}`
    serverUrl = url.replace(/\/$/, '')
  }, 60000)

  afterAll(async () => {
    await devServer?.close()
    await nitro?.close()
  })

  describe('critical: state after build', () => {
    it('scanSchemas should have ALL schemas immediately after build', () => {
      // This is the critical check - state immediately after build
      // Before any dev:start or other hooks run
      expect(nitro.scanSchemas.length).toBe(2)
      expect(nitro.scanSchemas.some((s: string) => s.includes('auth'))).toBe(true)
      expect(nitro.scanSchemas.some((s: string) => s.includes('ecommerce'))).toBe(true)
    })

    it('scanResolvers should have ALL resolvers immediately after build', () => {
      expect(nitro.scanResolvers.length).toBe(2)
      expect(nitro.scanResolvers.some((r: { specifier: string }) => r.specifier.includes('auth'))).toBe(true)
      expect(nitro.scanResolvers.some((r: { specifier: string }) => r.specifier.includes('ecommerce'))).toBe(true)
    })
  })

  describe('extend schema merge verification', () => {
    it('virtual module should include ALL schemas from ALL extends', () => {
      const schemasModule = nitro.options.virtual?.['#nitro-graphql/server-schemas']
      expect(schemasModule).toBeDefined()

      const code = typeof schemasModule === 'function' ? schemasModule() : ''
      console.warn('Virtual module code:', code)

      // Should have BOTH auth and ecommerce schemas
      expect(code).toContain('auth')
      expect(code).toContain('ecommerce')
    })

    it('virtual module should include ALL resolvers from ALL extends', () => {
      const resolversModule = nitro.options.virtual?.['#nitro-graphql/server-resolvers']
      expect(resolversModule).toBeDefined()

      const code = typeof resolversModule === 'function' ? resolversModule() : ''
      console.warn('Resolvers virtual module code:', code)

      // Should have BOTH auth and ecommerce resolvers
      expect(code).toContain('auth')
      expect(code).toContain('ecommerce')
    })

    it('nitro.scanSchemas should have ALL schemas from ALL extends', () => {
      console.warn('scanSchemas:', nitro.scanSchemas)

      // Should have 2 schemas
      expect(nitro.scanSchemas.length).toBe(2)
      expect(nitro.scanSchemas.some((s: string) => s.includes('auth'))).toBe(true)
      expect(nitro.scanSchemas.some((s: string) => s.includes('ecommerce'))).toBe(true)
    })

    it('nitro.scanResolvers should have ALL resolvers from ALL extends', () => {
      console.warn('scanResolvers:', nitro.scanResolvers)

      // Should have 2 resolvers
      expect(nitro.scanResolvers.length).toBe(2)
      expect(nitro.scanResolvers.some((r: { specifier: string }) => r.specifier.includes('auth'))).toBe(true)
      expect(nitro.scanResolvers.some((r: { specifier: string }) => r.specifier.includes('ecommerce'))).toBe(true)
    })
  })

  describe('introspection at API endpoint', () => {
    it('should respond to introspection query', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{ __schema { queryType { name } } }`,
        }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.errors).toBeUndefined()
      expect(result.data?.__schema).toBeDefined()
    })

    it('should include User type from auth extend', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: typeQuery('User') }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.errors).toBeUndefined()
      expect(result.data?.__type?.name).toBe('User')

      const fieldNames = result.data.__type.fields.map((f: { name: string }) => f.name)
      expect(fieldNames).toContain('id')
      expect(fieldNames).toContain('email')
    })

    it('should include Product type from ecommerce extend', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: typeQuery('Product') }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.errors).toBeUndefined()
      expect(result.data?.__type?.name).toBe('Product')

      const fieldNames = result.data.__type.fields.map((f: { name: string }) => f.name)
      expect(fieldNames).toContain('id')
      expect(fieldNames).toContain('name')
      expect(fieldNames).toContain('price')
    })

    it('should have merged Query with fields from both extends', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: typeQuery('Query') }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.errors).toBeUndefined()

      const queryFields = result.data.__type.fields.map((f: { name: string }) => f.name)

      expect(queryFields).toContain('currentUser') // from auth
      expect(queryFields).toContain('products') // from ecommerce
    })
  })

  describe('resolver execution from extends', () => {
    it('should execute currentUser resolver from auth extend', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ currentUser { id email } }',
        }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.errors).toBeUndefined()
      expect(result.data?.currentUser).toBeDefined()
      expect(result.data.currentUser.id).toBe('user-1')
      expect(result.data.currentUser.email).toBe('test@example.com')
    })

    it('should execute products resolver from ecommerce extend', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ products { id name price } }',
        }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.errors).toBeUndefined()
      expect(result.data?.products).toBeInstanceOf(Array)
      expect(result.data.products[0].id).toBe('prod-1')
      expect(result.data.products[0].name).toBe('Widget')
    })

    it('should execute combined query from both extends', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{
            currentUser { id email }
            products { id name price }
          }`,
        }),
      })

      expect(response.ok).toBe(true)
      const result = await response.json()
      expect(result.errors).toBeUndefined()
      expect(result.data?.currentUser).toBeDefined()
      expect(result.data?.products).toBeInstanceOf(Array)
    })
  })
})
