/**
 * E2E tests for extend package clientDir scanning
 *
 * This test verifies that client documents from extend packages
 * are properly scanned when clientDir is configured.
 *
 * Scenario:
 * - Extend package has `clientDir: 'client/graphql'` in nitro-graphql.config.ts
 * - Client documents (*.graphql) should be scanned from that directory
 * - These documents should be available for client type generation
 */
import type { Nitro } from 'nitro/types'
import { existsSync, readFileSync } from 'node:fs'
import { build, createNitro, prepare } from 'nitro/builder'
import { join, resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'
import { cleanupIsolatedFixture, createIsolatedFixture } from '../utils/fixture'

const fixturesDir = resolve(__dirname, '../fixtures')
const originalFixtureDir = resolve(fixturesDir, 'extend-multi')

// Will be set in beforeAll after creating isolated fixture
let isolatedFixtureDir: string

describe('extend Package clientDir E2E', () => {
  let nitro: Nitro

  beforeAll(async () => {
    // Create isolated copy of fixture to avoid conflicts with parallel tests
    isolatedFixtureDir = createIsolatedFixture(originalFixtureDir)

    nitro = await createNitro({
      rootDir: resolve(isolatedFixtureDir, 'main-project'),
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          skipLocalScan: true,
          extend: [
            resolve(isolatedFixtureDir, 'auth'),
            resolve(isolatedFixtureDir, 'ecommerce'),
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
    // Clean up isolated fixture
    cleanupIsolatedFixture(isolatedFixtureDir)
  })

  describe('clientDir scanning from extend packages', () => {
    it('should scan client documents from extend package clientDir', () => {
      // ecommerce package has clientDir: 'client/graphql' with products.graphql
      const docs = nitro.scanDocuments || []

      // Should include the products.graphql from ecommerce/client/graphql
      const hasEcommerceDoc = docs.some((d: string) =>
        d.includes('ecommerce') && d.includes('products.graphql'),
      )

      expect(hasEcommerceDoc).toBe(true)
    })

    it('should include all queries from extend package client documents', () => {
      const docs = nitro.scanDocuments || []

      // Find the ecommerce products document
      const ecommerceDoc = docs.find((d: string) =>
        d.includes('ecommerce') && d.includes('products.graphql'),
      )

      expect(ecommerceDoc).toBeDefined()
      expect(ecommerceDoc).toContain('client/graphql/products.graphql')
    })

    it('should include extend documents in codegen input', async () => {
      // Import the document loader to verify documents can be loaded
      const { loadGraphQLDocuments } = await import('../../src/core/codegen/document-loader')

      const docs = await loadGraphQLDocuments(nitro.scanDocuments)

      // Should have loaded the products.graphql document
      expect(docs.length).toBeGreaterThan(0)

      // Check that GetProducts query is in the loaded documents
      const hasGetProductsQuery = docs.some(doc =>
        doc.document?.definitions.some(def =>
          def.kind === 'OperationDefinition' && 'name' in def && def.name?.value === 'GetProducts',
        ),
      )
      expect(hasGetProductsQuery).toBe(true)
    })

    it('should generate client types with extend package queries', () => {
      // Check paths - types are in .graphql/ based on config
      const graphqlBuildDir = join(nitro.options.rootDir, '.graphql')
      const schemaPath = join(graphqlBuildDir, 'schema.graphql')
      const clientTypesPath = join(nitro.options.rootDir, '.graphql/nitro-graphql-client.d.ts')

      // First check if schema.graphql was generated
      expect(existsSync(schemaPath)).toBe(true)

      // Then check if client types were generated
      expect(existsSync(clientTypesPath)).toBe(true)

      const content = readFileSync(clientTypesPath, 'utf-8')

      // Should include GetProducts query type
      expect(content).toContain('GetProducts')
    })
  })
})
