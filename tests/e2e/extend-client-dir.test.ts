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
import { createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures')

describe('extend Package clientDir E2E', () => {
  let nitro: Nitro

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
        }),
      ],
    })

    await prepare(nitro)
  }, 60000)

  afterAll(async () => {
    await nitro?.close()
  })

  describe('clientDir scanning from extend packages', () => {
    it('should scan client documents from extend package clientDir', () => {
      // ecommerce package has clientDir: 'client/graphql' with products.graphql
      const docs = nitro.scanDocuments || []

      console.warn('scanDocuments:', docs)

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
  })
})
