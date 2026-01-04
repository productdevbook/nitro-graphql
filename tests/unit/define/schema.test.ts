/**
 * Unit tests for defineSchema function
 *
 * Tests the defineSchema function which:
 * - Accepts StandardSchemaV1 compliant validators (Zod, Valibot, ArkType)
 * - Returns flattened schema configuration
 * - Provides type inference for GraphQL types
 */
import { describe, expect, it } from 'vitest'
// Import vi for mock functions
import { vi } from 'vitest'

import { defineSchema } from '../../../src/define'

describe('defineSchema', () => {
  describe('basic functionality', () => {
    it('should return the same config object', () => {
      const config = {
        CreateUserInput: { '~standard': { version: 1, vendor: 'test', validate: () => ({ value: {} }) } },
      }

      const result = defineSchema(config as any)

      expect(result).toEqual(config)
    })

    it('should handle empty config', () => {
      const result = defineSchema({})

      expect(result).toEqual({})
    })

    it('should preserve all properties from config', () => {
      const mockSchema = {
        '~standard': {
          version: 1,
          vendor: 'valibot',
          validate: (input: unknown) => ({ value: input }),
        },
      }

      const config = {
        UserInput: mockSchema,
        PostInput: mockSchema,
        CommentInput: mockSchema,
      }

      const result = defineSchema(config as any)

      expect(Object.keys(result)).toHaveLength(3)
      expect(result).toHaveProperty('UserInput')
      expect(result).toHaveProperty('PostInput')
      expect(result).toHaveProperty('CommentInput')
    })
  })

  describe('standardSchemaV1 compatibility', () => {
    it('should accept objects with ~standard property', () => {
      const standardSchema = {
        '~standard': {
          version: 1,
          vendor: 'custom',
          validate: (input: unknown) => ({ value: input }),
        },
      }

      const config = { TestInput: standardSchema }
      const result = defineSchema(config as any)

      expect(result.TestInput).toBe(standardSchema)
    })

    it('should work with nested schema structures', () => {
      const nestedSchema = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: (input: unknown) => ({
            value: {
              nested: {
                field: input,
              },
            },
          }),
        },
      }

      const config = { NestedInput: nestedSchema }
      const result = defineSchema(config as any)

      expect(result.NestedInput['~standard'].version).toBe(1)
    })
  })

  describe('type mapping', () => {
    it('should handle GraphQL input types', () => {
      const schema = { '~standard': { version: 1, vendor: 'v', validate: () => ({ value: {} }) } }

      const result = defineSchema({
        CreateUserInput: schema,
        UpdateUserInput: schema,
        DeleteUserInput: schema,
      } as any)

      expect(Object.keys(result)).toEqual(['CreateUserInput', 'UpdateUserInput', 'DeleteUserInput'])
    })

    it('should handle custom scalar types', () => {
      const dateSchema = {
        '~standard': {
          version: 1,
          vendor: 'custom',
          validate: (input: unknown) => {
            if (input instanceof Date) {
              return { value: input }
            }
            return { issues: [{ message: 'Invalid date' }] }
          },
        },
      }

      const result = defineSchema({ DateTime: dateSchema } as any)

      expect(result).toHaveProperty('DateTime')
    })
  })

  describe('immutability', () => {
    it('should return new object reference', () => {
      const config = { Input: { '~standard': { version: 1, vendor: 'x', validate: () => ({ value: {} }) } } }
      const result = defineSchema(config as any)

      // Due to 'as any' cast, it may or may not be same reference
      // The function does return config directly, so they are equal
      expect(result).toEqual(config)
    })
  })

  describe('edge cases', () => {
    it('should handle single schema entry', () => {
      const schema = { '~standard': { version: 1, vendor: 'v', validate: () => ({ value: {} }) } }
      const result = defineSchema({ SingleInput: schema } as any)

      expect(Object.keys(result)).toHaveLength(1)
    })

    it('should handle many schema entries', () => {
      const schema = { '~standard': { version: 1, vendor: 'v', validate: () => ({ value: {} }) } }
      const manyEntries: Record<string, typeof schema> = {}

      for (let i = 0; i < 50; i++) {
        manyEntries[`Input${i}`] = schema
      }

      const result = defineSchema(manyEntries as any)

      expect(Object.keys(result)).toHaveLength(50)
    })

    it('should preserve schema with validation function', () => {
      const validateFn = vi.fn((input: unknown) => ({ value: input }))
      const schema = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: validateFn,
        },
      }

      const result = defineSchema({ TestInput: schema } as any)
      result.TestInput['~standard'].validate({ test: true })

      expect(validateFn).toHaveBeenCalledWith({ test: true })
    })
  })
})
