/**
 * E2E tests for Nuxt playground with nitro-graphql
 * Uses loadNuxt + build, then accesses Nitro via nuxt._nitro
 */
import type { Nuxt } from 'nuxt/schema'
import { build, loadNuxt } from 'nuxt'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const playgroundDir = resolve(__dirname, '../../playgrounds/nuxt')

describe('nuxt Playground E2E', () => {
  let nuxt: Nuxt
  let serverUrl: string

  beforeAll(async () => {
    // Load and build Nuxt
    nuxt = await loadNuxt({
      cwd: playgroundDir,
      ready: true,
      overrides: {
        dev: true,
      },
    })
    await build(nuxt)

    // Use nuxt.server which is already a NitroDevServer
    const server = await (nuxt as any).server.listen({ port: 0 })
    const url = server.url || `http://localhost:${server.port}`
    serverUrl = url.replace(/\/$/, '')
  }, 120000)

  afterAll(async () => {
    await nuxt?.close()
  })

  describe('graphQL queries', () => {
    it('should respond to hello query', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ hello }' }),
      })

      expect(response.ok).toBe(true)
      const json = await response.json()
      expect(json.errors).toBeUndefined()
      expect(json.data.hello).toBe('Hello World!')
    })

    it('should handle query with arguments', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ greeting(name: "Nuxt") }' }),
      })

      expect(response.ok).toBe(true)
      const json = await response.json()
      expect(json.errors).toBeUndefined()
      expect(json.data.greeting).toBe('Hello Nuxt!')
    })

    it('should support introspection', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{
            __schema {
              queryType {
                name
                fields { name }
              }
            }
          }`,
        }),
      })

      expect(response.ok).toBe(true)
      const json = await response.json()
      expect(json.errors).toBeUndefined()
      expect(json.data.__schema.queryType.name).toBe('Query')
    })

    it('should serve playground HTML', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'GET',
        headers: { Accept: 'text/html' },
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toContain('text/html')
    })

    it('should return health check status', async () => {
      const response = await fetch(`${serverUrl}/api/graphql/health`, {
        method: 'GET',
      })

      // Health endpoint returns JSON with status
      const json = await response.json()
      expect(json.status).toBeDefined()
    })

    it('should return errors for invalid queries', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: '{ invalidField }' }),
      })

      expect(response.ok).toBe(true)
      const json = await response.json()
      expect(json.errors).toBeDefined()
      expect(json.errors.length).toBeGreaterThan(0)
    })
  })
})
