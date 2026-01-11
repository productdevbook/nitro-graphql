import type { ScanContext } from '../../../src/core/types/scanning'
/**
 * Unit tests for schema scanning module
 *
 * Tests the scanSchemasCore and scanGraphqlCore functions which:
 * - Scan for GraphQL schema files (.graphql, .gql) in server directory
 * - Return file paths with warnings/errors
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { scanGraphqlCore, scanSchemasCore } from '../../../src/core/scanning/schemas'

// Mock tinyglobby
vi.mock('tinyglobby', () => ({
  glob: vi.fn(),
}))

describe('scanSchemasCore', () => {
  let mockContext: ScanContext
  let mockGlob: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { glob } = await import('tinyglobby')
    mockGlob = glob as ReturnType<typeof vi.fn>
    mockGlob.mockReset()

    mockContext = {
      rootDir: '/project',
      serverDir: '/project/server/graphql',
      clientDir: '/project/graphql',
      ignorePatterns: [],
      isDev: false,
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
    it('should scan for .graphql files in server directory', async () => {
      mockGlob.mockResolvedValue([
        '/project/server/graphql/schema.graphql',
        '/project/server/graphql/users/user.graphql',
      ])

      const result = await scanSchemasCore(mockContext)

      expect(result.items).toHaveLength(2)
      expect(result.items).toContain('/project/server/graphql/schema.graphql')
      expect(result.items).toContain('/project/server/graphql/users/user.graphql')
      expect(result.warnings).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should scan for both .graphql and .gql files in server directory', async () => {
      mockGlob.mockResolvedValue([
        '/project/server/graphql/schema.graphql',
        '/project/server/graphql/types.gql',
        '/project/server/graphql/queries.gql',
      ])

      const result = await scanSchemasCore(mockContext)

      expect(result.items).toHaveLength(3)
      expect(result.items).toContain('/project/server/graphql/schema.graphql')
      expect(result.items).toContain('/project/server/graphql/types.gql')
      expect(result.items).toContain('/project/server/graphql/queries.gql')
    })

    it('should return empty array when no files found', async () => {
      mockGlob.mockResolvedValue([])

      const result = await scanSchemasCore(mockContext)

      expect(result.items).toHaveLength(0)
      expect(result.warnings).toHaveLength(0)
      expect(result.errors).toHaveLength(0)
    })

    it('should call glob with correct pattern for both extensions', async () => {
      mockGlob.mockResolvedValue([])

      await scanSchemasCore(mockContext)

      expect(mockGlob).toHaveBeenCalledWith(
        expect.stringMatching(/\*\*\/\*\.\{graphql,gql\}/),
        expect.objectContaining({
          cwd: '/project',
          dot: true,
          absolute: true,
        }),
      )
    })
  })

  describe('error handling', () => {
    it('should return error when glob throws', async () => {
      mockGlob.mockRejectedValue(new Error('Glob failed'))

      const result = await scanSchemasCore(mockContext)

      expect(result.items).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Schema scanning error')
    })

    it('should handle ENOTDIR error gracefully', async () => {
      const enotdirError = new Error('Not a directory') as NodeJS.ErrnoException
      enotdirError.code = 'ENOTDIR'
      mockGlob.mockRejectedValue(enotdirError)

      const result = await scanSchemasCore(mockContext)

      // ENOTDIR is caught by glob wrapper, returns empty
      expect(result.items).toHaveLength(0)
    })
  })

  describe('ignore patterns', () => {
    it('should pass custom ignore patterns to glob', async () => {
      mockContext.ignorePatterns = ['**/generated/**']
      mockGlob.mockResolvedValue([])

      await scanSchemasCore(mockContext)

      expect(mockGlob).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          ignore: expect.arrayContaining(['**/generated/**']),
        }),
      )
    })
  })
})

describe('scanGraphqlCore', () => {
  let mockContext: ScanContext
  let mockGlob: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    const { glob } = await import('tinyglobby')
    mockGlob = glob as ReturnType<typeof vi.fn>
    mockGlob.mockReset()

    mockContext = {
      rootDir: '/project',
      serverDir: '/project/server/graphql',
      clientDir: '/project/graphql',
      ignorePatterns: [],
      isDev: false,
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

  describe('pattern matching', () => {
    it('should scan for both .graphql and .gql files', async () => {
      mockGlob.mockResolvedValue([
        '/project/server/graphql/schema.graphql',
        '/project/server/graphql/queries.gql',
      ])

      const result = await scanGraphqlCore(mockContext)

      expect(result.items).toHaveLength(2)
    })

    it('should call glob with correct pattern for both extensions', async () => {
      mockGlob.mockResolvedValue([])

      await scanGraphqlCore(mockContext)

      expect(mockGlob).toHaveBeenCalledWith(
        expect.stringMatching(/\*\*\/\*\.\{graphql,gql\}/),
        expect.any(Object),
      )
    })
  })

  describe('error handling', () => {
    it('should return error when glob throws', async () => {
      mockGlob.mockRejectedValue(new Error('Scan failed'))

      const result = await scanGraphqlCore(mockContext)

      expect(result.items).toHaveLength(0)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('GraphQL scanning error')
    })
  })
})
