/**
 * Unit tests for deterministic file ordering in scanning
 *
 * These tests verify that file scanning returns files in a consistent,
 * deterministic order regardless of filesystem order or layer combination.
 *
 * Bug: tinyglobby returns files in non-deterministic order, and when
 * combining files from multiple layers, the result should still be sorted.
 */
import type { ScanContext } from '../../../src/core/types/scanning'
import { resolve } from 'pathe'
import { describe, expect, it } from 'vitest'
import {
  scanDirectory,
  scanWithLayers,
} from '../../../src/core/scanning/common'

const fixturesDir = resolve(__dirname, '../../fixtures/ordering')

function createMockContext(): ScanContext {
  return {
    rootDir: fixturesDir,
    serverDir: resolve(fixturesDir, 'main/graphql'),
    logger: {
      warn: () => {},
      info: () => {},
      error: () => {},
      debug: () => {},
    } as any,
    ignorePatterns: [],
  }
}

describe('deterministic file ordering', () => {
  describe('scanDirectory', () => {
    it('should return files in sorted order', async () => {
      const ctx = createMockContext()
      const result = await scanDirectory(
        ctx,
        resolve(fixturesDir, 'main'),
        'graphql',
        '**/*.graphql',
      )

      const paths = result.map(f => f.path)

      // Files should be sorted alphabetically
      expect(paths).toEqual([
        'a-first.graphql',
        'm-middle.graphql',
        'z-last.graphql',
      ])
    })

    it('should return same order on multiple calls', async () => {
      const ctx = createMockContext()

      // Run multiple times to check consistency
      const results = await Promise.all([
        scanDirectory(ctx, resolve(fixturesDir, 'main'), 'graphql', '**/*.graphql'),
        scanDirectory(ctx, resolve(fixturesDir, 'main'), 'graphql', '**/*.graphql'),
        scanDirectory(ctx, resolve(fixturesDir, 'main'), 'graphql', '**/*.graphql'),
      ])

      const firstResult = results[0].map(f => f.path)

      // All results should be identical
      for (const result of results) {
        expect(result.map(f => f.path)).toEqual(firstResult)
      }
    })
  })

  describe('scanWithLayers', () => {
    it('should return files from all layers in sorted order', async () => {
      const ctx = createMockContext()
      const result = await scanWithLayers(ctx, {
        mainDir: resolve(fixturesDir, 'main'),
        mainSubDir: 'graphql',
        layerDirs: [
          resolve(fixturesDir, 'layer1'),
          resolve(fixturesDir, 'layer2'),
        ],
        layerSubDir: 'graphql',
        pattern: '**/*.graphql',
      })

      const paths = result.map(f => f.path)

      // Files from ALL layers should be sorted together alphabetically
      // Not: main files first, then layer1, then layer2
      // But: all files sorted by path regardless of source
      expect(paths).toEqual([
        'a-first.graphql', // main
        'b-layer1.graphql', // layer1
        'c-layer2.graphql', // layer2
        'm-middle.graphql', // main
        'z-last.graphql', // main
      ])
    })

    it('should return same order on multiple calls with layers', async () => {
      const ctx = createMockContext()
      const options = {
        mainDir: resolve(fixturesDir, 'main'),
        mainSubDir: 'graphql',
        layerDirs: [
          resolve(fixturesDir, 'layer1'),
          resolve(fixturesDir, 'layer2'),
        ],
        layerSubDir: 'graphql',
        pattern: '**/*.graphql',
      }

      // Run multiple times to check consistency
      const results = await Promise.all([
        scanWithLayers(ctx, options),
        scanWithLayers(ctx, options),
        scanWithLayers(ctx, options),
      ])

      const firstResult = results[0].map(f => f.path)

      // All results should be identical
      for (const result of results) {
        expect(result.map(f => f.path)).toEqual(firstResult)
      }
    })

    it('should handle empty layers', async () => {
      const ctx = createMockContext()
      const result = await scanWithLayers(ctx, {
        mainDir: resolve(fixturesDir, 'main'),
        mainSubDir: 'graphql',
        layerDirs: [],
        layerSubDir: 'graphql',
        pattern: '**/*.graphql',
      })

      const paths = result.map(f => f.path)

      expect(paths).toEqual([
        'a-first.graphql',
        'm-middle.graphql',
        'z-last.graphql',
      ])
    })

    it('should handle undefined layers', async () => {
      const ctx = createMockContext()
      const result = await scanWithLayers(ctx, {
        mainDir: resolve(fixturesDir, 'main'),
        mainSubDir: 'graphql',
        layerDirs: undefined,
        layerSubDir: 'graphql',
        pattern: '**/*.graphql',
      })

      const paths = result.map(f => f.path)

      expect(paths).toEqual([
        'a-first.graphql',
        'm-middle.graphql',
        'z-last.graphql',
      ])
    })
  })
})
