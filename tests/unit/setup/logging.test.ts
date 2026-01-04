/**
 * Unit tests for logging and startup info module
 *
 * Tests the resolveSecurityConfig function which:
 * - Provides environment-aware defaults for security settings
 * - Handles partial and undefined configurations
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { resolveSecurityConfig } from '../../../src/nitro/setup/logging'

describe('resolveSecurityConfig', () => {
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  describe('development environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development'
    })

    it('should enable introspection by default in development', () => {
      const result = resolveSecurityConfig()

      expect(result.introspection).toBe(true)
    })

    it('should enable playground by default in development', () => {
      const result = resolveSecurityConfig()

      expect(result.playground).toBe(true)
    })

    it('should disable error masking by default in development', () => {
      const result = resolveSecurityConfig()

      expect(result.maskErrors).toBe(false)
    })

    it('should enable field suggestions by default in development', () => {
      const result = resolveSecurityConfig()

      expect(result.disableSuggestions).toBe(false)
    })

    it('should return all development defaults when no config provided', () => {
      const result = resolveSecurityConfig()

      expect(result).toEqual({
        introspection: true,
        playground: true,
        maskErrors: false,
        disableSuggestions: false,
      })
    })
  })

  describe('production environment', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should disable introspection by default in production', () => {
      const result = resolveSecurityConfig()

      expect(result.introspection).toBe(false)
    })

    it('should disable playground by default in production', () => {
      const result = resolveSecurityConfig()

      expect(result.playground).toBe(false)
    })

    it('should enable error masking by default in production', () => {
      const result = resolveSecurityConfig()

      expect(result.maskErrors).toBe(true)
    })

    it('should disable field suggestions by default in production', () => {
      const result = resolveSecurityConfig()

      expect(result.disableSuggestions).toBe(true)
    })

    it('should return all production defaults when no config provided', () => {
      const result = resolveSecurityConfig()

      expect(result).toEqual({
        introspection: false,
        playground: false,
        maskErrors: true,
        disableSuggestions: true,
      })
    })
  })

  describe('custom configuration override', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production'
    })

    it('should allow enabling introspection in production', () => {
      const result = resolveSecurityConfig({ introspection: true })

      expect(result.introspection).toBe(true)
    })

    it('should allow enabling playground in production', () => {
      const result = resolveSecurityConfig({ playground: true })

      expect(result.playground).toBe(true)
    })

    it('should allow disabling error masking in production', () => {
      const result = resolveSecurityConfig({ maskErrors: false })

      expect(result.maskErrors).toBe(false)
    })

    it('should allow enabling field suggestions in production', () => {
      const result = resolveSecurityConfig({ disableSuggestions: false })

      expect(result.disableSuggestions).toBe(false)
    })

    it('should handle partial configuration', () => {
      const result = resolveSecurityConfig({
        introspection: true,
        playground: true,
      })

      expect(result).toEqual({
        introspection: true,
        playground: true,
        maskErrors: true, // default for production
        disableSuggestions: true, // default for production
      })
    })

    it('should handle complete configuration override', () => {
      const customConfig = {
        introspection: true,
        playground: true,
        maskErrors: false,
        disableSuggestions: false,
      }

      const result = resolveSecurityConfig(customConfig)

      expect(result).toEqual(customConfig)
    })
  })

  describe('edge cases', () => {
    it('should handle undefined config', () => {
      process.env.NODE_ENV = 'development'
      const result = resolveSecurityConfig(undefined)

      expect(result).toBeDefined()
      expect(typeof result.introspection).toBe('boolean')
    })

    it('should handle empty object config', () => {
      process.env.NODE_ENV = 'development'
      const result = resolveSecurityConfig({})

      expect(result).toBeDefined()
      expect(result.introspection).toBe(true)
    })

    it('should handle test environment like development', () => {
      process.env.NODE_ENV = 'test'
      const result = resolveSecurityConfig()

      // test is not 'production', so development defaults apply
      expect(result.introspection).toBe(true)
      expect(result.maskErrors).toBe(false)
    })
  })
})
