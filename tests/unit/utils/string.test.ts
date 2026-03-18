/**
 * Unit tests for shared string utilities
 *
 * Tests the capitalize function from src/core/utils/string.ts
 */
import { describe, expect, it } from 'vitest'
import { capitalize } from '../../../src/core/utils/string'

describe('capitalize', () => {
  it('should capitalize first character of a lowercase string', () => {
    expect(capitalize('hello')).toBe('Hello')
  })

  it('should leave already-capitalized string unchanged', () => {
    expect(capitalize('Hello')).toBe('Hello')
  })

  it('should capitalize single lowercase character', () => {
    expect(capitalize('a')).toBe('A')
  })

  it('should leave single uppercase character unchanged', () => {
    expect(capitalize('A')).toBe('A')
  })

  it('should return empty string for empty input', () => {
    expect(capitalize('')).toBe('')
  })

  it('should capitalize first character of all-uppercase string', () => {
    expect(capitalize('HELLO')).toBe('HELLO')
  })

  it('should capitalize first character of mixed-case string', () => {
    expect(capitalize('hELLO')).toBe('HELLO')
  })

  it('should handle strings starting with numbers', () => {
    // Numbers don't have uppercase, so the string remains unchanged
    expect(capitalize('123abc')).toBe('123abc')
  })

  it('should handle strings with spaces', () => {
    // Only the first character is affected
    expect(capitalize('hello world')).toBe('Hello world')
  })

  it('should handle camelCase input', () => {
    expect(capitalize('mySubscription')).toBe('MySubscription')
  })

  it('should handle strings starting with special characters', () => {
    expect(capitalize('_private')).toBe('_private')
  })

  it('should preserve the rest of the string exactly', () => {
    const input = 'testWithCamelCase'
    const result = capitalize(input)
    expect(result).toBe('TestWithCamelCase')
    expect(result.slice(1)).toBe(input.slice(1))
  })
})
