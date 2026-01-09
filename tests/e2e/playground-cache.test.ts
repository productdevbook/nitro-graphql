/**
 * E2E tests for playground cache headers
 *
 * Verifies that:
 * - GET requests to /api/graphql (playground) have cache headers
 * - POST requests (GraphQL queries) do NOT have cache headers
 */
import type { Nitro } from 'nitro/types'
import { build, createDevServer, createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')

describe('playground Cache Headers E2E', () => {
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
          ],
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    devServer = createDevServer(nitro)
    const server = await devServer.listen({ port: 0 })
    const url = server.url || `http://localhost:${(server as unknown as { port: number }).port}`
    serverUrl = url.replace(/\/$/, '')
  }, 60000)

  afterAll(async () => {
    await devServer?.close()
    await nitro?.close()
  })

  describe('cache headers', () => {
    it('get request (playground) should have cache-control header', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'GET',
        headers: { Accept: 'text/html' },
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toContain('text/html')

      const cacheControl = response.headers.get('cache-control')
      expect(cacheControl).toBeDefined()
      expect(cacheControl).toContain('public')
      expect(cacheControl).toContain('max-age=2592000') // 1 month
    })

    it('post request (GraphQL query) should NOT have playground cache header', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ __typename }',
        }),
      })

      expect(response.ok).toBe(true)

      const cacheControl = response.headers.get('cache-control')
      // POST requests should not have our custom 1-month cache header
      // They either have no cache-control or a different one
      if (cacheControl) {
        expect(cacheControl).not.toContain('max-age=2592000')
      }
      else {
        expect(cacheControl).toBeNull()
      }
    })

    it('get request with query param should NOT have playground cache header', async () => {
      // GET with ?query= is a GraphQL query over GET, not playground
      const response = await fetch(
        `${serverUrl}/api/graphql?query=${encodeURIComponent('{ __typename }')}`,
        { method: 'GET' },
      )

      expect(response.ok).toBe(true)

      const cacheControl = response.headers.get('cache-control')
      // Query over GET should not have our custom 1-month cache header
      if (cacheControl) {
        expect(cacheControl).not.toContain('max-age=2592000')
      }
      else {
        expect(cacheControl).toBeNull()
      }
    })
  })
})
