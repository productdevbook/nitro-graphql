/**
 * E2E tests for demo schema functionality
 *
 * Verifies that when no schema files exist, the module provides a demo schema
 * with a hello query that works out of the box.
 */
import type { Nitro } from 'nitro/types'
import { mkdirSync, rmSync } from 'node:fs'
import { build, createDevServer, createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

// Create a temporary empty project directory for testing
const tempDir = resolve(__dirname, '../fixtures/.temp-demo-schema-test')

describe('demo Schema E2E', () => {
  let nitro: Nitro
  let devServer: ReturnType<typeof createDevServer>
  let serverUrl: string

  beforeAll(async () => {
    // Create empty project structure
    rmSync(tempDir, { recursive: true, force: true })
    mkdirSync(resolve(tempDir, 'server/graphql'), { recursive: true })

    nitro = await createNitro({
      rootDir: tempDir,
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
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
    // Clean up temp directory
    rmSync(tempDir, { recursive: true, force: true })
  })

  describe('demo schema when no schemas exist', () => {
    it('should respond to hello query with demo response', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: '{ hello }',
        }),
      })

      expect(response.ok).toBe(true)

      const json = await response.json()
      expect(json.errors).toBeUndefined()
      expect(json.data).toBeDefined()
      expect(json.data.hello).toBe('Hello from nitro-graphql!')
    })

    it('should support introspection with demo schema', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: `{
            __schema {
              queryType {
                name
                fields {
                  name
                }
              }
            }
          }`,
        }),
      })

      expect(response.ok).toBe(true)

      const json = await response.json()
      expect(json.errors).toBeUndefined()
      expect(json.data.__schema.queryType.name).toBe('Query')

      const fields = json.data.__schema.queryType.fields
      const helloField = fields.find((f: { name: string }) => f.name === 'hello')
      expect(helloField).toBeDefined()
    })

    it('playground should be accessible', async () => {
      const response = await fetch(`${serverUrl}/api/graphql`, {
        method: 'GET',
        headers: { Accept: 'text/html' },
      })

      expect(response.ok).toBe(true)
      expect(response.headers.get('content-type')).toContain('text/html')
    })
  })
})
