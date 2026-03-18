/**
 * Unit tests for deterministic file ordering in scanning
 *
 * These tests verify that file scanning returns files in a consistent,
 * deterministic order regardless of filesystem order.
 *
 * Bug: tinyglobby returns files in non-deterministic order, so the
 * scanDirectory function sorts files for deterministic output.
 */
import type { ScanContext } from '../../../src/core/types/scanning'
import { resolve } from 'pathe'
import { describe, expect, it } from 'vitest'
import {
  scanDirectory,
} from '../../../src/core/scanning/file-scanner'

const fixturesDir = resolve(__dirname, '../../fixtures/ordering')

function createMockContext(): ScanContext {
  return {
    rootDir: fixturesDir,
    serverDir: resolve(fixturesDir, 'main/graphql'),
    clientDir: resolve(fixturesDir, 'main/graphql'),
    isDev: false,
    logger: {
      warn: () => {},
      info: () => {},
      error: () => {},
      debug: () => {},
      success: () => {},
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
})
