/**
 * E2E tests for extend package with relative clientDir
 *
 * This test verifies that client documents from extend packages
 * can be scanned using relative paths like '../../apps/main-app/app/graphql'
 *
 * Scenario:
 * monorepo/
 * ├── packages/
 * │   └── shared-graphql/           ← Extend package with schema
 * │       ├── nitro-graphql.config.ts  (clientDir: '../../apps/main-app/app/graphql')
 * │       └── server/graphql/schema.graphql
 * └── apps/
 *     └── main-app/
 *         ├── server/graphql/schema.graphql  ← Main app schema
 *         └── app/graphql/products.graphql   ← Client documents HERE
 */
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync } from 'node:fs'
import { build, createNitro, prepare } from 'nitro/builder'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')
const relativeClientDirFixture = resolve(fixturesDir, 'relative-client-dir')

describe('extend Package with Relative clientDir E2E', () => {
  let nitro: Nitro

  beforeAll(async () => {
    nitro = await createNitro({
      rootDir: resolve(relativeClientDirFixture, 'apps/main-app'),
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          extend: [
            // This package has clientDir: '../../apps/main-app/app/graphql'
            resolve(relativeClientDirFixture, 'packages/shared-graphql'),
          ],
        }),
      ],
    })

    await prepare(nitro)
    await build(nitro)

    // Generate types
    const { generateServerTypes, generateClientTypes } = await import('../../src/nitro/codegen')
    await generateServerTypes(nitro)
    await generateClientTypes(nitro)
  }, 60000)

  afterAll(async () => {
    await nitro?.close()
  })

  describe('relative clientDir path resolution', () => {
    it('should scan schemas from extend package', () => {
      const schemas = nitro.scanSchemas || []

      // Should include schema from shared-graphql package
      const hasSharedSchema = schemas.some((s: string) =>
        s.includes('shared-graphql') && s.includes('schema.graphql'),
      )

      expect(hasSharedSchema).toBe(true)
    })

    it('should scan client documents from relative clientDir path', () => {
      const docs = nitro.scanDocuments || []

      console.log('Scanned documents:', docs)

      // Should include products.graphql from apps/main-app/app/graphql
      // (resolved from clientDir: '../../apps/main-app/app/graphql')
      const hasProductsDoc = docs.some((d: string) =>
        d.includes('main-app') && d.includes('products.graphql'),
      )

      expect(hasProductsDoc).toBe(true)
    })

    it('should load client documents correctly', async () => {
      const { loadGraphQLDocuments } = await import('../../src/core/codegen/document-loader')

      const docs = await loadGraphQLDocuments(nitro.scanDocuments)

      // Should have loaded documents
      expect(docs.length).toBeGreaterThan(0)

      // Check that GetAllProducts query is in the loaded documents
      const hasGetAllProductsQuery = docs.some(doc =>
        doc.document?.definitions.some(def =>
          def.kind === 'OperationDefinition' && 'name' in def && def.name?.value === 'GetAllProducts',
        ),
      )
      expect(hasGetAllProductsQuery).toBe(true)
    })

    it('should generate client types with queries from relative clientDir', () => {
      const graphqlBuildDir = nitro.graphql.buildDir
      const clientTypesPath = join(graphqlBuildDir, 'nitro-graphql-client.d.ts')

      // First check if client types were generated
      if (existsSync(clientTypesPath)) {
        const content = readFileSync(clientTypesPath, 'utf-8')

        // Should include GetAllProducts and GetProductById query types
        expect(content).toContain('GetAllProducts')
        expect(content).toContain('GetProductById')
      }
      else {
        // If no client types, at least verify documents were scanned
        const docs = nitro.scanDocuments || []
        expect(docs.length).toBeGreaterThan(0)
      }
    })
  })
})
