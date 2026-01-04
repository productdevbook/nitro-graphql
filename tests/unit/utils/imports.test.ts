/**
 * Unit tests for imports utility module
 *
 * Tests the import ID generation and relative path utilities:
 * - getImportId: generates unique hashed identifiers for file paths
 * - relativeWithDot: ensures relative paths have leading dot notation
 */
import { hash } from 'ohash'
import { describe, expect, it } from 'vitest'
import { getImportId, relativeWithDot } from '../../../src/core/utils/imports'

describe('getImportId', () => {
  describe('basic functionality', () => {
    it('should generate a unique import ID for a file path', () => {
      const result = getImportId('/path/to/file.ts')

      expect(result).toBeDefined()
      expect(typeof result).toBe('string')
    })

    it('should start with underscore for non-lazy imports', () => {
      const result = getImportId('/path/to/file.ts')

      expect(result).toMatch(/^_[a-z0-9]{6}$/i)
    })

    it('should start with _lazy_ prefix for lazy imports', () => {
      const result = getImportId('/path/to/file.ts', true)

      expect(result).toMatch(/^_lazy_[a-zA-Z0-9]{6}$/)
    })

    it('should generate 6 character hash after prefix', () => {
      const nonLazy = getImportId('/path/to/file.ts')
      const lazy = getImportId('/path/to/file.ts', true)

      // Non-lazy: _ + 6 chars = 7 chars
      expect(nonLazy).toHaveLength(7)
      // Lazy: _lazy_ + 6 chars = 12 chars
      expect(lazy).toHaveLength(12)
    })
  })

  describe('hash consistency', () => {
    it('should generate consistent ID for same path', () => {
      const result1 = getImportId('/path/to/file.ts')
      const result2 = getImportId('/path/to/file.ts')

      expect(result1).toBe(result2)
    })

    it('should generate consistent ID for same path with same lazy flag', () => {
      const lazy1 = getImportId('/path/to/file.ts', true)
      const lazy2 = getImportId('/path/to/file.ts', true)

      expect(lazy1).toBe(lazy2)
    })

    it('should generate different ID for different paths', () => {
      const result1 = getImportId('/path/to/fileA.ts')
      const result2 = getImportId('/path/to/fileB.ts')

      expect(result1).not.toBe(result2)
    })

    it('should match expected hash format', () => {
      const path = '/server/graphql/user.resolver.ts'
      const expectedHash = `_${hash(path).replace(/-/g, '').slice(0, 6)}`

      const result = getImportId(path)

      expect(result).toBe(expectedHash)
    })

    it('should match expected hash format for lazy imports', () => {
      const path = '/server/graphql/user.resolver.ts'
      const expectedHash = `_lazy_${hash(path).replace(/-/g, '').slice(0, 6)}`

      const result = getImportId(path, true)

      expect(result).toBe(expectedHash)
    })
  })

  describe('hash format', () => {
    it('should not contain hyphens in the ID', () => {
      const testPaths = [
        '/a/b/c.ts',
        '/very/long/path/to/file.ts',
        '/x.ts',
        '/path-with-hyphens/file-name.ts',
        '/some/path/with-many-hyphens-in-name/file.ts',
      ]

      for (const path of testPaths) {
        const result = getImportId(path)
        expect(result).not.toContain('-')
      }
    })

    it('should not contain hyphens in lazy imports', () => {
      const testPaths = [
        '/a/b/c.ts',
        '/path-with-hyphens/file-name.ts',
      ]

      for (const path of testPaths) {
        const result = getImportId(path, true)
        expect(result).not.toContain('-')
      }
    })

    it('should only contain alphanumeric characters after prefix', () => {
      const result = getImportId('/complex/path/to/file.resolver.ts')

      // Remove the underscore prefix and check remaining chars
      const hashPart = result.slice(1)
      expect(hashPart).toMatch(/^[a-z0-9]+$/i)
    })
  })

  describe('edge cases', () => {
    it('should handle empty string path', () => {
      const result = getImportId('')

      expect(result).toBeDefined()
      expect(result).toMatch(/^_[a-z0-9]{6}$/i)
    })

    it('should handle paths with special characters', () => {
      const result = getImportId('/path/with spaces/file.ts')

      expect(result).toBeDefined()
      expect(result).toMatch(/^_[a-z0-9]{6}$/i)
    })

    it('should handle Windows-style paths', () => {
      const result = getImportId('C:\\Users\\project\\file.ts')

      expect(result).toBeDefined()
      expect(result).toMatch(/^_[a-z0-9]{6}$/i)
    })

    it('should handle very long paths', () => {
      const longPath = `${'/a'.repeat(500)}/file.ts`
      const result = getImportId(longPath)

      expect(result).toBeDefined()
      expect(result).toHaveLength(7)
    })

    it('should handle paths with unicode characters', () => {
      const result = getImportId('/path/to/archivo.ts')

      expect(result).toBeDefined()
      expect(result).toMatch(/^_[a-z0-9]{6}$/i)
    })

    it('should handle lazy flag as false explicitly', () => {
      const withFalse = getImportId('/path/to/file.ts', false)
      const withoutFlag = getImportId('/path/to/file.ts')

      expect(withFalse).toBe(withoutFlag)
    })

    it('should handle lazy flag as undefined', () => {
      const withUndefined = getImportId('/path/to/file.ts', undefined)
      const withoutFlag = getImportId('/path/to/file.ts')

      expect(withUndefined).toBe(withoutFlag)
    })
  })

  describe('lazy vs non-lazy imports', () => {
    it('should generate different IDs for lazy vs non-lazy with same path', () => {
      const nonLazy = getImportId('/path/to/file.ts', false)
      const lazy = getImportId('/path/to/file.ts', true)

      expect(nonLazy).not.toBe(lazy)
    })

    it('should have same hash part for lazy and non-lazy', () => {
      const nonLazy = getImportId('/path/to/file.ts', false)
      const lazy = getImportId('/path/to/file.ts', true)

      // Extract the hash part (last 6 characters)
      const nonLazyHash = nonLazy.slice(-6)
      const lazyHash = lazy.slice(-6)

      expect(nonLazyHash).toBe(lazyHash)
    })
  })
})

describe('relativeWithDot', () => {
  describe('basic functionality', () => {
    it('should return relative path with leading dot for sibling files', () => {
      const result = relativeWithDot('/project/src', '/project/src/file.ts')

      expect(result).toBe('./file.ts')
    })

    it('should return relative path with leading dot for nested files', () => {
      const result = relativeWithDot('/project', '/project/src/utils/file.ts')

      expect(result).toBe('./src/utils/file.ts')
    })

    it('should preserve existing relative path format for parent directories', () => {
      const result = relativeWithDot('/project/src/utils', '/project/lib/file.ts')

      // Should start with ../ since we're going up
      expect(result).toMatch(/^\.\.\//)
    })
  })

  describe('leading dot handling', () => {
    it('should add leading dot when path does not start with ./ or ../', () => {
      const result = relativeWithDot('/project', '/project/file.ts')

      expect(result).toBe('./file.ts')
      expect(result.startsWith('./')).toBe(true)
    })

    it('should not double-add dot when going to parent directory', () => {
      const result = relativeWithDot('/project/src/nested', '/project/file.ts')

      // Should be ../../file.ts, not ./../../file.ts
      expect(result).toBe('../../file.ts')
      expect(result.startsWith('./')).toBe(false)
    })

    it('should preserve single parent directory reference', () => {
      const result = relativeWithDot('/project/src', '/project/file.ts')

      expect(result).toBe('../file.ts')
    })
  })

  describe('same directory', () => {
    it('should handle same directory paths', () => {
      const result = relativeWithDot('/project/src', '/project/src/index.ts')

      expect(result).toBe('./index.ts')
    })
  })

  describe('edge cases', () => {
    it('should handle deeply nested paths', () => {
      const from = '/project/src/components/ui/buttons'
      const to = '/project/src/utils/helpers/string.ts'

      const result = relativeWithDot(from, to)

      expect(result).toBe('../../../utils/helpers/string.ts')
    })

    it('should handle paths at project root', () => {
      const result = relativeWithDot('/project', '/project/package.json')

      expect(result).toBe('./package.json')
    })

    it('should handle completely different paths', () => {
      const result = relativeWithDot('/projectA/src', '/projectB/lib/file.ts')

      // Should start with ../ for going to different base
      expect(result.startsWith('..')).toBe(true)
    })
  })
})
