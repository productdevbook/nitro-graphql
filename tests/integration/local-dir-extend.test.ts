/**
 * Integration tests for LocalDirExtendSource
 *
 * Tests that schemas, resolvers, and documents are properly loaded
 * from LocalDirExtendSource (used for Nuxt layers).
 *
 * Fixture structure:
 * - local-dir-extend/
 *   ├── main/                    → Main project
 *   │   └── server/graphql/
 *   │       └── main.graphql
 *   └── layer/                   → Layer (extended via LocalDirExtendSource)
 *       ├── server/graphql/
 *       │   ├── layer.graphql
 *       │   └── layer.resolver.ts
 *       └── app/graphql/
 *           └── layer-query.graphql
 */
import type { Nitro } from 'nitro/types'
import { createNitro, prepare } from 'nitro/builder'
import { resolve } from 'pathe'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import graphql from '../../src'

const fixturesDir = resolve(__dirname, '../fixtures/local-dir-extend')

describe('localDirExtendSource integration', () => {
  let nitro: Nitro

  beforeAll(async () => {
    nitro = await createNitro({
      rootDir: resolve(fixturesDir, 'main'),
      dev: true,
      modules: [
        graphql({
          framework: 'graphql-yoga',
          // Extend using LocalDirExtendSource format (like Nuxt layers)
          extend: [
            {
              serverDir: resolve(fixturesDir, 'layer/server/graphql'),
              clientDir: resolve(fixturesDir, 'layer/app/graphql'),
            },
          ],
          // Disable type generation in tests
          types: { enabled: false },
        }),
      ],
    })

    await prepare(nitro)
  }, 30000)

  afterAll(async () => {
    if (nitro) {
      await nitro.close()
    }
  })

  describe('schema loading', () => {
    it('should load schemas from both main and layer', () => {
      expect(nitro.scanSchemas.length).toBe(2)
    })

    it('should include schema from main project', () => {
      const hasMainSchema = nitro.scanSchemas.some(
        (s: string) => s.includes('main/server/graphql/main.graphql'),
      )
      expect(hasMainSchema).toBe(true)
    })

    it('should include schema from layer', () => {
      const hasLayerSchema = nitro.scanSchemas.some(
        (s: string) => s.includes('layer/server/graphql/layer.graphql'),
      )
      expect(hasLayerSchema).toBe(true)
    })
  })

  describe('resolver loading', () => {
    it('should load resolvers from layer', () => {
      const hasLayerResolver = nitro.scanResolvers.some(
        (r: { specifier: string }) => r.specifier.includes('layer/server/graphql/layer.resolver.ts'),
      )
      expect(hasLayerResolver).toBe(true)
    })

    it('should parse resolver exports correctly', () => {
      const layerResolver = nitro.scanResolvers.find(
        (r: { specifier: string }) => r.specifier.includes('layer.resolver.ts'),
      )
      expect(layerResolver).toBeDefined()
      expect(layerResolver!.imports).toBeDefined()
      expect(layerResolver!.imports.length).toBeGreaterThan(0)
    })
  })

  describe('document loading', () => {
    it('should load documents from layer clientDir', () => {
      const hasLayerDoc = nitro.scanDocuments.some(
        (d: string) => d.includes('layer/app/graphql/layer-query.graphql'),
      )
      expect(hasLayerDoc).toBe(true)
    })
  })
})
