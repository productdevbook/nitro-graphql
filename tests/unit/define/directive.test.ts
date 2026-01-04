import { describe, expect, it } from 'vitest'
import { defineDirective } from '../../../src/define'

describe('defineDirective', () => {
  describe('schema generation', () => {
    it('should generate simple directive schema', () => {
      const config = {
        name: 'upper',
        locations: ['FIELD_DEFINITION'] as const,
      }
      defineDirective(config)

      // __schema is added to the original config object
      expect((config as any).__schema).toBe('directive @upper on FIELD_DEFINITION')
    })

    it('should generate directive schema with multiple locations', () => {
      const config = {
        name: 'auth',
        locations: ['FIELD_DEFINITION', 'OBJECT'] as const,
      }
      defineDirective(config)

      expect((config as any).__schema).toBe('directive @auth on FIELD_DEFINITION | OBJECT')
    })

    it('should generate directive schema with arguments', () => {
      const config = {
        name: 'rateLimit',
        locations: ['FIELD_DEFINITION'] as const,
        args: {
          limit: { type: 'Int!' as const },
          duration: { type: 'Int!' as const },
        },
      }
      defineDirective(config)

      expect((config as any).__schema).toBe('directive @rateLimit(limit: Int!, duration: Int!) on FIELD_DEFINITION')
    })

    it('should generate directive schema with default values', () => {
      const config = {
        name: 'cache',
        locations: ['FIELD_DEFINITION'] as const,
        args: {
          maxAge: { type: 'Int' as const, defaultValue: 60 },
        },
      }
      defineDirective(config)

      expect((config as any).__schema).toBe('directive @cache(maxAge: Int = 60) on FIELD_DEFINITION')
    })

    it('should handle string default values', () => {
      const config = {
        name: 'deprecated',
        locations: ['FIELD_DEFINITION'] as const,
        args: {
          reason: { type: 'String' as const, defaultValue: 'No longer supported' },
        },
      }
      defineDirective(config)

      expect((config as any).__schema).toBe('directive @deprecated(reason: String = "No longer supported") on FIELD_DEFINITION')
    })

    it('should handle boolean default values', () => {
      const config = {
        name: 'include',
        locations: ['FIELD'] as const,
        args: {
          if: { type: 'Boolean!' as const, defaultValue: true },
        },
      }
      defineDirective(config)

      expect((config as any).__schema).toBe('directive @include(if: Boolean! = true) on FIELD')
    })

    it('should handle multiple arguments with mixed default values', () => {
      const config = {
        name: 'complexity',
        locations: ['FIELD_DEFINITION'] as const,
        args: {
          value: { type: 'Int!' as const },
          multipliers: { type: '[String!]' as const, defaultValue: [] },
        },
      }
      defineDirective(config)

      expect((config as any).__schema).toBe('directive @complexity(value: Int!, multipliers: [String!] = []) on FIELD_DEFINITION')
    })
  })

  describe('__schema property on config', () => {
    it('should be non-enumerable on config object', () => {
      const config = {
        name: 'test',
        locations: ['FIELD_DEFINITION'] as const,
      }
      defineDirective(config)

      const keys = Object.keys(config)
      expect(keys).not.toContain('__schema')
    })

    it('should not appear in Object.entries of config', () => {
      const config = {
        name: 'test',
        locations: ['FIELD_DEFINITION'] as const,
      }
      defineDirective(config)

      const entries = Object.entries(config)
      const schemaEntry = entries.find(([key]) => key === '__schema')
      expect(schemaEntry).toBeUndefined()
    })

    it('should be accessible directly on config', () => {
      const config = {
        name: 'hidden',
        locations: ['OBJECT'] as const,
      }
      defineDirective(config)

      expect((config as any).__schema).toBeDefined()
      expect(typeof (config as any).__schema).toBe('string')
    })

    it('should be non-writable on config', () => {
      const config = {
        name: 'immutable',
        locations: ['FIELD_DEFINITION'] as const,
      }
      defineDirective(config)

      const originalSchema = (config as any).__schema

      // Attempt to modify should throw in strict mode
      expect(() => {
        'use strict';
        (config as any).__schema = 'modified'
      }).toThrow()

      expect((config as any).__schema).toBe(originalSchema)
    })

    it('should be non-configurable on config', () => {
      const config = {
        name: 'locked',
        locations: ['FIELD_DEFINITION'] as const,
      }
      defineDirective(config)

      expect(() => {
        Object.defineProperty(config, '__schema', {
          value: 'changed',
        })
      }).toThrow()
    })
  })

  describe('return value', () => {
    it('should return locations as mutable array', () => {
      const directive = defineDirective({
        name: 'mutable',
        locations: ['FIELD_DEFINITION'],
      })

      // Should be able to push to the array (mutable)
      expect(() => {
        directive.locations.push('OBJECT')
      }).not.toThrow()

      expect(directive.locations).toContain('OBJECT')
    })

    it('should return a copy of the locations array', () => {
      const originalLocations: readonly string[] = ['FIELD_DEFINITION']
      const directive = defineDirective({
        name: 'copy',
        locations: originalLocations as any,
      })

      directive.locations.push('OBJECT')

      // Original should not be modified
      expect(originalLocations).toHaveLength(1)
      expect(directive.locations).toHaveLength(2)
    })

    it('should preserve all config properties', () => {
      const transformer = (schema: any) => schema
      const directive = defineDirective({
        name: 'full',
        locations: ['FIELD_DEFINITION', 'OBJECT'],
        args: {
          role: { type: 'String!', defaultValue: 'USER' },
        },
        description: 'A full directive',
        isRepeatable: true,
        transformer,
      })

      expect(directive.name).toBe('full')
      expect(directive.locations).toEqual(['FIELD_DEFINITION', 'OBJECT'])
      expect(directive.args).toEqual({
        role: { type: 'String!', defaultValue: 'USER' },
      })
      expect(directive.description).toBe('A full directive')
      expect(directive.isRepeatable).toBe(true)
      expect(directive.transformer).toBe(transformer)
    })

    it('should return DirectiveDefinition type', () => {
      const directive = defineDirective({
        name: 'typed',
        locations: ['FIELD_DEFINITION'],
      })

      // Type checks - these should exist on DirectiveDefinition
      expect(directive.name).toBeDefined()
      expect(directive.locations).toBeDefined()
      expect(Array.isArray(directive.locations)).toBe(true)
    })

    it('should not have __schema on returned object (non-enumerable property lost in spread)', () => {
      // Note: This documents current behavior - __schema is added to config but
      // not preserved in the returned spread object. The __schema property is
      // only accessible on the original config object passed to defineDirective.
      const directive = defineDirective({
        name: 'test',
        locations: ['FIELD_DEFINITION'],
      })

      expect((directive as any).__schema).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle single location', () => {
      const config = {
        name: 'single',
        locations: ['QUERY'] as const,
      }
      defineDirective(config)

      expect((config as any).__schema).toBe('directive @single on QUERY')
    })

    it('should handle all possible locations', () => {
      const allLocations = [
        'QUERY',
        'MUTATION',
        'SUBSCRIPTION',
        'FIELD',
        'FRAGMENT_DEFINITION',
        'FRAGMENT_SPREAD',
        'INLINE_FRAGMENT',
        'VARIABLE_DEFINITION',
        'SCHEMA',
        'SCALAR',
        'OBJECT',
        'FIELD_DEFINITION',
        'ARGUMENT_DEFINITION',
        'INTERFACE',
        'UNION',
        'ENUM',
        'ENUM_VALUE',
        'INPUT_OBJECT',
        'INPUT_FIELD_DEFINITION',
      ] as const

      const config = {
        name: 'everywhere',
        locations: allLocations,
      }
      defineDirective(config)

      expect((config as any).__schema).toBe(`directive @everywhere on ${allLocations.join(' | ')}`)
    })

    it('should handle directive with no args', () => {
      const config = {
        name: 'noargs',
        locations: ['FIELD_DEFINITION'] as const,
      }
      defineDirective(config)

      expect((config as any).__schema).not.toContain('(')
      expect((config as any).__schema).not.toContain(')')
    })

    it('should handle null default value', () => {
      const config = {
        name: 'nullable',
        locations: ['FIELD_DEFINITION'] as const,
        args: {
          value: { type: 'String' as const, defaultValue: null },
        },
      }
      defineDirective(config)

      expect((config as any).__schema).toBe('directive @nullable(value: String = null) on FIELD_DEFINITION')
    })
  })
})
