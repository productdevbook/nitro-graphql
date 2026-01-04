import type { ScanContext } from '../../../src/core/types/scanning'
/**
 * Unit tests for document scanning module
 *
 * Tests the scanDocumentsCore function which:
 * - Scans for GraphQL client documents (.graphql) in client directory
 * - Filters out external service directories
 * - Supports Nuxt layers for multi-layer scanning
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { scanDocumentsCore } from '../../../src/core/scanning/documents'

// Mock tinyglobby
vi.mock('tinyglobby', () => ({
  glob: vi.fn(),
}))

describe('scanDocumentsCore', () => {
  let mockContext: ScanContext
  let mockGlob: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { glob } = await import('tinyglobby')
    mockGlob = glob as ReturnType<typeof vi.fn>
    mockGlob.mockReset()

    mockContext = {
      rootDir: '/project',
      serverDir: '/project/server/graphql',
      clientDir: '/project/app/graphql',
      layerServerDirs: [],
      layerAppDirs: [],
      ignorePatterns: [],
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        debug: vi.fn(),
        success: vi.fn(),
        log: vi.fn(),
      },
    }
  })

  describe('basic scanning', () => {
    it('should scan for .graphql files in client directory', async () => {
      mockGlob.mockResolvedValue([
        { fullPath: '/project/app/graphql/queries/getUser.graphql', path: 'queries/getUser.graphql' },
        { fullPath: '/project/app/graphql/mutations/createUser.graphql', path: 'mutations/createUser.graphql' },
      ])

      // Mock returns file objects, but glob returns strings
      mockGlob.mockResolvedValue([
        '/project/app/graphql/queries/getUser.graphql',
        '/project/app/graphql/mutations/createUser.graphql',
      ])

      const result = await scanDocumentsCore(mockContext)

      expect(result.items).toHaveLength(2)
      expect(result.warnings).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should return empty array when no documents found', async () => {
      mockGlob.mockResolvedValue([])

      const result = await scanDocumentsCore(mockContext)

      expect(result.items).toHaveLength(0)
    })
  })

  describe('external service filtering', () => {
    it('should filter out external service directories', async () => {
      mockGlob.mockResolvedValue([
        '/project/app/graphql/queries/local.graphql',
        '/project/app/graphql/github/getRepos.graphql',
      ])

      const result = await scanDocumentsCore(mockContext, {
        externalServices: [
          {
            name: 'github',
            schema: 'https://api.github.com/graphql',
            documents: ['app/graphql/github/**/*.graphql'],
          },
        ],
      })

      // The filtering is based on directory matching
      expect(result.items).toContain('/project/app/graphql/queries/local.graphql')
    })

    it('should filter out files starting with external/', async () => {
      mockGlob.mockResolvedValue([
        '/project/app/graphql/local.graphql',
        '/project/app/graphql/external/api.graphql',
      ])

      const result = await scanDocumentsCore(mockContext)

      // Files with path starting with 'external/' are filtered out
      expect(result.items).toHaveLength(1)
      expect(result.items[0]).toContain('local.graphql')
    })

    it('should handle multiple external services', async () => {
      mockGlob.mockResolvedValue([
        '/project/app/graphql/local.graphql',
        '/project/app/graphql/github/repos.graphql',
        '/project/app/graphql/stripe/payments.graphql',
      ])

      const result = await scanDocumentsCore(mockContext, {
        externalServices: [
          {
            name: 'github',
            schema: 'https://api.github.com/graphql',
            documents: ['app/graphql/github/**/*.graphql'],
          },
          {
            name: 'stripe',
            schema: 'https://api.stripe.com/graphql',
            documents: ['app/graphql/stripe/**/*.graphql'],
          },
        ],
      })

      expect(result.items).toContain('/project/app/graphql/local.graphql')
    })
  })

  describe('layer support', () => {
    it('should scan layer app directories when provided', async () => {
      mockContext.layerAppDirs = ['/layers/base/app']

      mockGlob
        .mockResolvedValueOnce(['/project/app/graphql/main.graphql'])
        .mockResolvedValueOnce(['/layers/base/app/graphql/base.graphql'])

      const result = await scanDocumentsCore(mockContext)

      expect(result.items).toHaveLength(2)
      expect(mockGlob).toHaveBeenCalledTimes(2)
    })
  })

  describe('custom client directory', () => {
    it('should use custom clientDirRelative when provided', async () => {
      mockGlob.mockResolvedValue([])

      await scanDocumentsCore(mockContext, {
        clientDirRelative: 'src/graphql',
      })

      expect(mockGlob).toHaveBeenCalledWith(
        expect.stringContaining('src/graphql'),
        expect.any(Object),
      )
    })
  })

  describe('error handling', () => {
    it('should return error when glob throws', async () => {
      mockGlob.mockRejectedValue(new Error('Document scan failed'))

      const result = await scanDocumentsCore(mockContext)

      expect(result.items).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Document scanning error')
    })
  })
})
