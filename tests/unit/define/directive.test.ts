import { describe, expect, it } from 'vitest'
import { defineDirective } from '../../../src/define'

describe('defineDirective', () => {
  describe('schema generation', () => {
    it('should generate simple directive schema', () => {
      const directive = defineDirective({
        name: 'upper',
        locations: ['FIELD_DEFINITION'],
      })

      expect((directive as any).__schema).toBe('directive @upper on FIELD_DEFINITION')
    })

    it('should generate directive schema with multiple locations', () => {
      const directive = defineDirective({
        name: 'auth',
        locations: ['FIELD_DEFINITION', 'OBJECT'],
      })

      expect((directive as any).__schema).toBe('directive @auth on FIELD_DEFINITION | OBJECT')
    })

    it('should generate directive schema with arguments', () => {
      const directive = defineDirective({
        name: 'rateLimit',
        locations: ['FIELD_DEFINITION'],
        args: {
          limit: { type: 'Int!' },
          duration: { type: 'Int!' },
        },
      })

      expect((directive as any).__schema).toBe('directive @rateLimit(limit: Int!, duration: Int!) on FIELD_DEFINITION')
    })

    it('should generate directive schema with default values', () => {
      const directive = defineDirective({
        name: 'cache',
        locations: ['FIELD_DEFINITION'],
        args: {
          maxAge: { type: 'Int', defaultValue: 60 },
        },
      })

      expect((directive as any).__schema).toBe('directive @cache(maxAge: Int = 60) on FIELD_DEFINITION')
    })

    it('should handle string default values', () => {
      const directive = defineDirective({
        name: 'deprecated',
        locations: ['FIELD_DEFINITION'],
        args: {
          reason: { type: 'String', defaultValue: 'No longer supported' },
        },
      })

      expect((directive as any).__schema).toBe('directive @deprecated(reason: String = "No longer supported") on FIELD_DEFINITION')
    })

    it('should handle boolean default values', () => {
      const directive = defineDirective({
        name: 'include',
        locations: ['FIELD'],
        args: {
          if: { type: 'Boolean!', defaultValue: true },
        },
      })

      expect((directive as any).__schema).toBe('directive @include(if: Boolean! = true) on FIELD')
    })

    it('should handle multiple arguments with mixed default values', () => {
      const directive = defineDirective({
        name: 'complexity',
        locations: ['FIELD_DEFINITION'],
        args: {
          value: { type: 'Int!' },
          multipliers: { type: '[String!]', defaultValue: [] },
        },
      })

      expect((directive as any).__schema).toBe('directive @complexity(value: Int!, multipliers: [String!] = []) on FIELD_DEFINITION')
    })
  })

  describe('__schema property on returned directive', () => {
    it('should be non-enumerable on returned object', () => {
      const directive = defineDirective({
        name: 'test',
        locations: ['FIELD_DEFINITION'],
      })

      const keys = Object.keys(directive)
      expect(keys).not.toContain('__schema')
    })

    it('should not appear in Object.entries', () => {
      const directive = defineDirective({
        name: 'test',
        locations: ['FIELD_DEFINITION'],
      })

      const entries = Object.entries(directive)
      const schemaEntry = entries.find(([key]) => key === '__schema')
      expect(schemaEntry).toBeUndefined()
    })

    it('should be accessible directly on returned directive', () => {
      const directive = defineDirective({
        name: 'hidden',
        locations: ['OBJECT'],
      })

      expect((directive as any).__schema).toBeDefined()
      expect(typeof (directive as any).__schema).toBe('string')
    })

    it('should be non-writable on returned directive', () => {
      const directive = defineDirective({
        name: 'immutable',
        locations: ['FIELD_DEFINITION'],
      })

      const originalSchema = (directive as any).__schema

      expect(() => {
        'use strict';
        (directive as any).__schema = 'modified'
      }).toThrow()

      expect((directive as any).__schema).toBe(originalSchema)
    })

    it('should be non-configurable on returned directive', () => {
      const directive = defineDirective({
        name: 'locked',
        locations: ['FIELD_DEFINITION'],
      })

      expect(() => {
        Object.defineProperty(directive, '__schema', {
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

      expect(directive.name).toBeDefined()
      expect(directive.locations).toBeDefined()
      expect(Array.isArray(directive.locations)).toBe(true)
    })

    it('should have __schema on returned object as non-enumerable', () => {
      const directive = defineDirective({
        name: 'test',
        locations: ['FIELD_DEFINITION'],
      })

      // __schema is now correctly preserved on the returned object
      expect((directive as any).__schema).toBe('directive @test on FIELD_DEFINITION')
      // But not enumerable
      expect(Object.keys(directive)).not.toContain('__schema')
    })
  })

  describe('edge cases', () => {
    it('should handle single location', () => {
      const directive = defineDirective({
        name: 'single',
        locations: ['QUERY'],
      })

      expect((directive as any).__schema).toBe('directive @single on QUERY')
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

      const directive = defineDirective({
        name: 'everywhere',
        locations: [...allLocations],
      })

      expect((directive as any).__schema).toBe(`directive @everywhere on ${allLocations.join(' | ')}`)
    })

    it('should handle directive with no args', () => {
      const directive = defineDirective({
        name: 'noargs',
        locations: ['FIELD_DEFINITION'],
      })

      expect((directive as any).__schema).not.toContain('(')
      expect((directive as any).__schema).not.toContain(')')
    })

    it('should handle null default value', () => {
      const directive = defineDirective({
        name: 'nullable',
        locations: ['FIELD_DEFINITION'],
        args: {
          value: { type: 'String', defaultValue: null },
        },
      })

      expect((directive as any).__schema).toBe('directive @nullable(value: String = null) on FIELD_DEFINITION')
    })
  })
})
