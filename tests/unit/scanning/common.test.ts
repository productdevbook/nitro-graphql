/**
 * Unit tests for common scanning utilities
 *
 * Tests utility functions for file scanning:
 * - deduplicateFiles
 * - filterByExtension
 * - extractPaths
 */
import { describe, expect, it } from 'vitest'
import {
  deduplicateFiles,
  extractPaths,
  filterByExtension,
} from '../../../src/core/scanning/common'

describe('deduplicateFiles', () => {
  it('should return unique files by fullPath', () => {
    const files = [
      { fullPath: '/a.ts', path: 'a.ts' },
      { fullPath: '/b.ts', path: 'b.ts' },
      { fullPath: '/a.ts', path: 'a.ts' }, // duplicate
    ]

    const result = deduplicateFiles(files)

    expect(result).toHaveLength(2)
  })

  it('should preserve first occurrence of duplicate', () => {
    const files = [
      { fullPath: '/a.ts', path: 'first' },
      { fullPath: '/a.ts', path: 'second' },
    ]

    const result = deduplicateFiles(files)

    expect(result[0].path).toBe('first')
  })

  it('should return empty array for empty input', () => {
    const result = deduplicateFiles([])

    expect(result).toHaveLength(0)
  })

  it('should return same array when no duplicates', () => {
    const files = [
      { fullPath: '/a.ts', path: 'a.ts' },
      { fullPath: '/b.ts', path: 'b.ts' },
      { fullPath: '/c.ts', path: 'c.ts' },
    ]

    const result = deduplicateFiles(files)

    expect(result).toHaveLength(3)
  })

  it('should handle files with additional properties', () => {
    const files = [
      { fullPath: '/a.ts', path: 'a.ts', extra: 'data1' },
      { fullPath: '/a.ts', path: 'a.ts', extra: 'data2' },
    ]

    const result = deduplicateFiles(files)

    expect(result).toHaveLength(1)
    expect((result[0] as any).extra).toBe('data1')
  })

  it('should handle many duplicates', () => {
    const files = Array.from({ length: 100 }).fill({
      fullPath: '/same.ts',
      path: 'same.ts',
    })

    const result = deduplicateFiles(files)

    expect(result).toHaveLength(1)
  })
})

describe('filterByExtension', () => {
  it('should filter files by single extension', () => {
    const files = [
      { fullPath: '/a.ts' },
      { fullPath: '/b.js' },
      { fullPath: '/c.ts' },
    ]

    const result = filterByExtension(files, ['.ts'])

    expect(result).toHaveLength(2)
    expect(result.every(f => f.fullPath.endsWith('.ts'))).toBe(true)
  })

  it('should filter files by multiple extensions', () => {
    const files = [
      { fullPath: '/a.ts' },
      { fullPath: '/b.js' },
      { fullPath: '/c.tsx' },
      { fullPath: '/d.json' },
    ]

    const result = filterByExtension(files, ['.ts', '.tsx'])

    expect(result).toHaveLength(2)
  })

  it('should return empty array when no matches', () => {
    const files = [
      { fullPath: '/a.js' },
      { fullPath: '/b.js' },
    ]

    const result = filterByExtension(files, ['.ts'])

    expect(result).toHaveLength(0)
  })

  it('should return empty array for empty files', () => {
    const result = filterByExtension([], ['.ts'])

    expect(result).toHaveLength(0)
  })

  it('should return empty array for empty extensions', () => {
    const files = [{ fullPath: '/a.ts' }]

    const result = filterByExtension(files, [])

    expect(result).toHaveLength(0)
  })

  it('should handle files with multiple dots in name', () => {
    const files = [
      { fullPath: '/my.file.test.ts' },
      { fullPath: '/my.file.test.js' },
    ]

    const result = filterByExtension(files, ['.ts'])

    expect(result).toHaveLength(1)
    expect(result[0].fullPath).toBe('/my.file.test.ts')
  })

  it('should handle .graphql extension', () => {
    const files = [
      { fullPath: '/schema.graphql' },
      { fullPath: '/schema.gql' },
      { fullPath: '/schema.ts' },
    ]

    const result = filterByExtension(files, ['.graphql', '.gql'])

    expect(result).toHaveLength(2)
  })
})

describe('extractPaths', () => {
  it('should extract fullPath from files', () => {
    const files = [
      { fullPath: '/a.ts', path: 'a.ts' },
      { fullPath: '/b.ts', path: 'b.ts' },
    ]

    const result = extractPaths(files)

    expect(result).toEqual(['/a.ts', '/b.ts'])
  })

  it('should return empty array for empty input', () => {
    const result = extractPaths([])

    expect(result).toHaveLength(0)
  })

  it('should preserve order', () => {
    const files = [
      { fullPath: '/z.ts', path: 'z.ts' },
      { fullPath: '/a.ts', path: 'a.ts' },
      { fullPath: '/m.ts', path: 'm.ts' },
    ]

    const result = extractPaths(files)

    expect(result).toEqual(['/z.ts', '/a.ts', '/m.ts'])
  })

  it('should handle paths with special characters', () => {
    const files = [
      { fullPath: '/path with spaces/file.ts', path: 'file.ts' },
      { fullPath: '/path-with-dashes/file.ts', path: 'file.ts' },
    ]

    const result = extractPaths(files)

    expect(result).toEqual([
      '/path with spaces/file.ts',
      '/path-with-dashes/file.ts',
    ])
  })
})
