import { hash } from 'ohash'
/**
 * Unit tests for resolver scanning module
 *
 * Tests the parseResolverCall function which:
 * - Maps define* function names to resolver types
 * - Generates unique hashed aliases for imports
 * - Returns null for unknown function names
 */
import { describe, expect, it } from 'vitest'
import { parseResolverCall } from '../../../src/core/scanning/resolvers'

const HASHED_ALIAS_RE = /^_\w{6}$/
const HYPHEN_RE = /-/g

describe('parseResolverCall', () => {
  describe('valid define* function calls', () => {
    it('should parse defineResolver calls', () => {
      const result = parseResolverCall('defineResolver', 'userResolver', '/path/to/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('userResolver')
      expect(result!.type).toBe('resolver')
      expect(result!.as).toMatch(HASHED_ALIAS_RE)
    })

    it('should parse defineQuery calls', () => {
      const result = parseResolverCall('defineQuery', 'userQueries', '/path/to/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('userQueries')
      expect(result!.type).toBe('query')
      expect(result!.as).toMatch(HASHED_ALIAS_RE)
    })

    it('should parse defineMutation calls', () => {
      const result = parseResolverCall('defineMutation', 'userMutations', '/path/to/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('userMutations')
      expect(result!.type).toBe('mutation')
      expect(result!.as).toMatch(HASHED_ALIAS_RE)
    })

    it('should parse defineField calls', () => {
      const result = parseResolverCall('defineField', 'customFields', '/path/to/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('customFields')
      expect(result!.type).toBe('type')
      expect(result!.as).toMatch(HASHED_ALIAS_RE)
    })

    it('should parse defineSubscription calls', () => {
      const result = parseResolverCall('defineSubscription', 'notificationSubs', '/path/to/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('notificationSubs')
      expect(result!.type).toBe('subscription')
      expect(result!.as).toMatch(HASHED_ALIAS_RE)
    })

    it('should parse defineDirective calls', () => {
      const result = parseResolverCall('defineDirective', 'authDirective', '/path/to/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('authDirective')
      expect(result!.type).toBe('directive')
      expect(result!.as).toMatch(HASHED_ALIAS_RE)
    })
  })

  describe('alias hash generation', () => {
    it('should generate consistent hash for same export name and file path', () => {
      const result1 = parseResolverCall('defineQuery', 'myQuery', '/path/to/file.ts')
      const result2 = parseResolverCall('defineQuery', 'myQuery', '/path/to/file.ts')

      expect(result1!.as).toBe(result2!.as)
    })

    it('should generate different hash for different export names', () => {
      const result1 = parseResolverCall('defineQuery', 'queryA', '/path/to/file.ts')
      const result2 = parseResolverCall('defineQuery', 'queryB', '/path/to/file.ts')

      expect(result1!.as).not.toBe(result2!.as)
    })

    it('should generate different hash for different file paths', () => {
      const result1 = parseResolverCall('defineQuery', 'myQuery', '/path/to/fileA.ts')
      const result2 = parseResolverCall('defineQuery', 'myQuery', '/path/to/fileB.ts')

      expect(result1!.as).not.toBe(result2!.as)
    })

    it('should generate hash matching expected format', () => {
      const exportName = 'userQueries'
      const filePath = '/server/graphql/user.resolver.ts'
      const expectedHash = `_${hash(exportName + filePath).replace(HYPHEN_RE, '').slice(0, 6)}`

      const result = parseResolverCall('defineQuery', exportName, filePath)

      expect(result!.as).toBe(expectedHash)
    })

    it('should not contain hyphens in alias', () => {
      // Test multiple cases to ensure hyphens are always removed
      const testCases = [
        { export: 'test', path: '/a/b/c.ts' },
        { export: 'longExportName', path: '/very/long/path/to/file.ts' },
        { export: 'a', path: '/x.ts' },
      ]

      for (const { export: exp, path } of testCases) {
        const result = parseResolverCall('defineQuery', exp, path)
        expect(result!.as).not.toContain('-')
      }
    })
  })

  describe('invalid function calls', () => {
    it('should return null for unknown function names', () => {
      const result = parseResolverCall('unknownFunction', 'export', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for defineGraphQLConfig', () => {
      const result = parseResolverCall('defineGraphQLConfig', 'config', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for defineSchema', () => {
      const result = parseResolverCall('defineSchema', 'schema', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for similar but incorrect function names', () => {
      const invalidNames = [
        'define_Query',
        'DefineQuery',
        'DEFINEQUERY',
        'definequery',
        'define',
        'Query',
        'createQuery',
        'useQuery',
      ]

      for (const name of invalidNames) {
        const result = parseResolverCall(name, 'export', '/path/file.ts')
        expect(result).toBeNull()
      }
    })

    it('should return null for empty string function name', () => {
      const result = parseResolverCall('', 'export', '/path/file.ts')
      expect(result).toBeNull()
    })
  })

  describe('type mapping', () => {
    it('should correctly map all function names to types', () => {
      const mappings = [
        { fn: 'defineResolver', type: 'resolver' },
        { fn: 'defineQuery', type: 'query' },
        { fn: 'defineMutation', type: 'mutation' },
        { fn: 'defineField', type: 'type' },
        { fn: 'defineSubscription', type: 'subscription' },
        { fn: 'defineDirective', type: 'directive' },
      ] as const

      for (const { fn, type } of mappings) {
        const result = parseResolverCall(fn, 'test', '/test.ts')
        expect(result!.type).toBe(type)
      }
    })
  })

  describe('edge cases', () => {
    it('should handle export names with special characters', () => {
      const result = parseResolverCall('defineQuery', 'user_Queries$1', '/path/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('user_Queries$1')
    })

    it('should handle very long export names', () => {
      const longName = 'a'.repeat(100)
      const result = parseResolverCall('defineQuery', longName, '/path/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe(longName)
      expect(result!.as).toHaveLength(7) // underscore + 6 chars
    })

    it('should handle file paths with special characters', () => {
      const result = parseResolverCall('defineQuery', 'test', '/path/with spaces/file.ts')

      expect(result).not.toBeNull()
      expect(result!.as).toMatch(HASHED_ALIAS_RE)
    })

    it('should handle Windows-style paths', () => {
      const result = parseResolverCall('defineQuery', 'test', 'C:\\Users\\project\\file.ts')

      expect(result).not.toBeNull()
      expect(result!.as).toMatch(HASHED_ALIAS_RE)
    })
  })
})
