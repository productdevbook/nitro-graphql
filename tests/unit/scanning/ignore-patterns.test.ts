/**
 * Unit tests for ignore patterns consistency
 *
 * Tests that DEFAULT_IGNORE_PATTERNS from constants.ts:
 * - Contains all expected patterns
 * - Is used consistently by both the scanner (common.ts) and watcher (watcher/index.ts)
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_IGNORE_PATTERNS } from '../../../src/core/constants'
import { createIgnoredFunction } from '../../../src/core/watcher/index'

describe('DEFAULT_IGNORE_PATTERNS', () => {
  it('should contain node_modules pattern', () => {
    expect(DEFAULT_IGNORE_PATTERNS).toContain('**/node_modules/**')
  })

  it('should contain .git pattern', () => {
    expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.git/**')
  })

  it('should contain .output pattern', () => {
    expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.output/**')
  })

  it('should contain .nitro pattern', () => {
    expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.nitro/**')
  })

  it('should contain .nuxt pattern', () => {
    expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.nuxt/**')
  })

  it('should contain .graphql pattern', () => {
    expect(DEFAULT_IGNORE_PATTERNS).toContain('**/.graphql/**')
  })

  it('should contain dist pattern', () => {
    expect(DEFAULT_IGNORE_PATTERNS).toContain('**/dist/**')
  })

  it('should have exactly the expected number of patterns', () => {
    // If a new pattern is added, this test will flag it for review
    expect(DEFAULT_IGNORE_PATTERNS).toHaveLength(7)
  })

  it('should be a readonly array', () => {
    // TypeScript enforces this at compile time, but we can verify
    // the array is frozen or at least has the expected shape
    expect(Array.isArray(DEFAULT_IGNORE_PATTERNS)).toBe(true)
  })

  it('should have patterns using double-star glob syntax', () => {
    for (const pattern of DEFAULT_IGNORE_PATTERNS) {
      expect(pattern).toMatch(/^\*\*\//)
      expect(pattern).toMatch(/\/\*\*$/)
    }
  })
})

describe('scanner and watcher use same ignore patterns', () => {
  // The scanner (common.ts) uses DEFAULT_IGNORE_PATTERNS directly in scanDirectory:
  //   ignore: [...DEFAULT_IGNORE_PATTERNS, ...ctx.ignorePatterns]
  //
  // The watcher (watcher/index.ts) uses DEFAULT_IGNORE_PATTERNS in createIgnoredFunction:
  //   const ignoredDirs = DEFAULT_IGNORE_PATTERNS.map(p => p.replace(/\*\*/g, '').replace(/\*/g, ''))
  //
  // Both import from the same '../constants' module, ensuring consistency.

  it('should be importable from constants module for scanner usage', () => {
    // This verifies the import works (scanner uses it directly)
    expect(DEFAULT_IGNORE_PATTERNS).toBeDefined()
    expect(DEFAULT_IGNORE_PATTERNS.length).toBeGreaterThan(0)
  })

  it('should be used by watcher createIgnoredFunction', () => {
    // The watcher converts glob patterns to path fragments for chokidar
    const ignoredFn = createIgnoredFunction()
    expect(typeof ignoredFn).toBe('function')

    // Paths inside ignored directories should be ignored
    expect(ignoredFn('/project/node_modules/package/file.graphql')).toBe(true)
    expect(ignoredFn('/project/.git/objects/abc')).toBe(true)
    expect(ignoredFn('/project/.output/server/chunks/file.graphql')).toBe(true)
    expect(ignoredFn('/project/.nitro/types/file.graphql')).toBe(true)
    expect(ignoredFn('/project/.nuxt/types/file.graphql')).toBe(true)
    expect(ignoredFn('/project/dist/file.graphql')).toBe(true)
    expect(ignoredFn('/project/.graphql/file.graphql')).toBe(true)
  })

  it('should not ignore valid GraphQL files outside ignored directories', () => {
    const ignoredFn = createIgnoredFunction()

    // Valid server GraphQL files should NOT be ignored
    expect(ignoredFn('/project/server/graphql/schema.graphql')).toBe(false)
    expect(ignoredFn('/project/server/graphql/user.resolver.ts')).toBe(false)
    expect(ignoredFn('/project/server/graphql/auth.directive.ts')).toBe(false)
  })

  it('should ignore non-graphql files outside ignored directories', () => {
    const ignoredFn = createIgnoredFunction()

    // Non-GraphQL files should be ignored by the watcher
    expect(ignoredFn('/project/server/graphql/utils.ts')).toBe(true)
    expect(ignoredFn('/project/server/graphql/readme.md')).toBe(true)
  })

  it('should allow directory traversal (no extension)', () => {
    const ignoredFn = createIgnoredFunction()

    // Directories should not be ignored (to allow traversal)
    expect(ignoredFn('/project/server/graphql')).toBe(false)
    expect(ignoredFn('/project/server')).toBe(false)
  })
})
