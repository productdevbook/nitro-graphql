import { hash } from 'ohash'
/**
 * Unit tests for directive scanning module
 *
 * Tests the parseDirectiveCall function which:
 * - Only accepts defineDirective function calls
 * - Returns null for all other function types
 * - Generates unique hashed aliases for imports
 */
import { describe, expect, it } from 'vitest'
import { parseDirectiveCall } from '../../../src/core/scanning/directives'

describe('parseDirectiveCall', () => {
  describe('valid defineDirective calls', () => {
    it('should parse defineDirective calls', () => {
      const result = parseDirectiveCall('defineDirective', 'authDirective', '/path/to/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('authDirective')
      expect(result!.type).toBe('directive')
      expect(result!.as).toMatch(/^_\w{6}$/)
    })

    it('should always return type as directive', () => {
      const result = parseDirectiveCall('defineDirective', 'anyName', '/any/path.ts')

      expect(result!.type).toBe('directive')
    })
  })

  describe('alias hash generation', () => {
    it('should generate consistent hash for same export name and file path', () => {
      const result1 = parseDirectiveCall('defineDirective', 'myDirective', '/path/to/file.ts')
      const result2 = parseDirectiveCall('defineDirective', 'myDirective', '/path/to/file.ts')

      expect(result1!.as).toBe(result2!.as)
    })

    it('should generate different hash for different export names', () => {
      const result1 = parseDirectiveCall('defineDirective', 'directiveA', '/path/to/file.ts')
      const result2 = parseDirectiveCall('defineDirective', 'directiveB', '/path/to/file.ts')

      expect(result1!.as).not.toBe(result2!.as)
    })

    it('should generate different hash for different file paths', () => {
      const result1 = parseDirectiveCall('defineDirective', 'myDirective', '/path/to/fileA.ts')
      const result2 = parseDirectiveCall('defineDirective', 'myDirective', '/path/to/fileB.ts')

      expect(result1!.as).not.toBe(result2!.as)
    })

    it('should generate hash matching expected format', () => {
      const exportName = 'authDirective'
      const filePath = '/server/graphql/auth.directive.ts'
      const expectedHash = `_${hash(exportName + filePath).replace(/-/g, '').slice(0, 6)}`

      const result = parseDirectiveCall('defineDirective', exportName, filePath)

      expect(result!.as).toBe(expectedHash)
    })

    it('should not contain hyphens in alias', () => {
      const testCases = [
        { export: 'test', path: '/a/b/c.ts' },
        { export: 'longDirectiveName', path: '/very/long/path/to/file.ts' },
        { export: 'a', path: '/x.ts' },
      ]

      for (const { export: exp, path } of testCases) {
        const result = parseDirectiveCall('defineDirective', exp, path)
        expect(result!.as).not.toContain('-')
      }
    })
  })

  describe('non-directive function calls', () => {
    it('should return null for defineResolver', () => {
      const result = parseDirectiveCall('defineResolver', 'myResolver', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for defineQuery', () => {
      const result = parseDirectiveCall('defineQuery', 'myQuery', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for defineMutation', () => {
      const result = parseDirectiveCall('defineMutation', 'myMutation', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for defineField', () => {
      const result = parseDirectiveCall('defineField', 'myField', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for defineSubscription', () => {
      const result = parseDirectiveCall('defineSubscription', 'mySub', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for all resolver-type functions', () => {
      const resolverFunctions = [
        'defineResolver',
        'defineQuery',
        'defineMutation',
        'defineField',
        'defineSubscription',
      ]

      for (const fn of resolverFunctions) {
        const result = parseDirectiveCall(fn, 'export', '/path/file.ts')
        expect(result).toBeNull()
      }
    })
  })

  describe('unknown function calls', () => {
    it('should return null for unknown function names', () => {
      const result = parseDirectiveCall('unknownFunction', 'export', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for defineGraphQLConfig', () => {
      const result = parseDirectiveCall('defineGraphQLConfig', 'config', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for defineSchema', () => {
      const result = parseDirectiveCall('defineSchema', 'schema', '/path/file.ts')
      expect(result).toBeNull()
    })

    it('should return null for similar but incorrect function names', () => {
      const invalidNames = [
        'define_Directive',
        'DefineDirective',
        'DEFINEDIRECTIVE',
        'definedirective',
        'directive',
        'createDirective',
        'useDirective',
      ]

      for (const name of invalidNames) {
        const result = parseDirectiveCall(name, 'export', '/path/file.ts')
        expect(result).toBeNull()
      }
    })

    it('should return null for empty string function name', () => {
      const result = parseDirectiveCall('', 'export', '/path/file.ts')
      expect(result).toBeNull()
    })
  })

  describe('edge cases', () => {
    it('should handle export names with special characters', () => {
      const result = parseDirectiveCall('defineDirective', 'auth_Directive$1', '/path/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe('auth_Directive$1')
    })

    it('should handle very long export names', () => {
      const longName = 'a'.repeat(100)
      const result = parseDirectiveCall('defineDirective', longName, '/path/file.ts')

      expect(result).not.toBeNull()
      expect(result!.name).toBe(longName)
      expect(result!.as).toHaveLength(7) // underscore + 6 chars
    })

    it('should handle file paths with special characters', () => {
      const result = parseDirectiveCall('defineDirective', 'test', '/path/with spaces/file.ts')

      expect(result).not.toBeNull()
      expect(result!.as).toMatch(/^_\w{6}$/)
    })

    it('should handle Windows-style paths', () => {
      const result = parseDirectiveCall('defineDirective', 'test', 'C:\\Users\\project\\file.ts')

      expect(result).not.toBeNull()
      expect(result!.as).toMatch(/^_\w{6}$/)
    })
  })

  describe('comparison with parseResolverCall behavior', () => {
    /**
     * parseDirectiveCall is a specialized version that ONLY accepts defineDirective
     * parseResolverCall accepts all define* functions including defineDirective
     * This ensures directive scanning only picks up directive files
     */
    it('should be more restrictive than parseResolverCall', () => {
      // parseDirectiveCall should accept ONLY defineDirective
      const directiveResult = parseDirectiveCall('defineDirective', 'test', '/file.ts')
      expect(directiveResult).not.toBeNull()

      // All other define* functions should be rejected
      const queryResult = parseDirectiveCall('defineQuery', 'test', '/file.ts')
      const mutationResult = parseDirectiveCall('defineMutation', 'test', '/file.ts')
      const resolverResult = parseDirectiveCall('defineResolver', 'test', '/file.ts')

      expect(queryResult).toBeNull()
      expect(mutationResult).toBeNull()
      expect(resolverResult).toBeNull()
    })
  })
})
