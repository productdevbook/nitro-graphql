/**
 * Unit tests for the shared type generation helper
 *
 * Tests the regenerateTypes function which:
 * - Generates server types and passes schema string to client types when server is enabled
 * - Only generates client types when server is disabled
 * - Passes through the silent option
 * - Passes schema string from server codegen to client codegen (avoids disk round-trip)
 */
import type { Nitro } from 'nitro/types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the codegen module
vi.mock('../../../src/nitro/codegen', () => ({
  generateServerTypes: vi.fn(),
  generateClientTypes: vi.fn(),
}))

// Mock the scanner module
vi.mock('../../../src/nitro/setup/scanner', () => ({
  isServerEnabled: vi.fn(),
}))

import { generateClientTypes, generateServerTypes } from '../../../src/nitro/codegen'
import { isServerEnabled } from '../../../src/nitro/setup/scanner'
import { regenerateTypes } from '../../../src/nitro/setup/type-generation'

// ============ Helpers ============

function createMockNitro(overrides: Record<string, any> = {}): Nitro {
  return {
    options: {
      rootDir: '/project',
      graphql: {
        server: true,
        ...overrides.graphql,
      },
      ...overrides,
    },
    graphql: {
      state: {
        schemas: [],
        resolvers: [],
        directives: [],
        documents: [],
        directiveSchemas: null,
        extendConfigs: [],
        extendSchemas: [],
      },
    },
  } as any
}

// ============ Tests ============

describe('regenerateTypes', () => {
  let mockNitro: Nitro

  beforeEach(() => {
    vi.clearAllMocks()
    mockNitro = createMockNitro()
    vi.mocked(isServerEnabled).mockReturnValue(true)
    vi.mocked(generateServerTypes).mockResolvedValue('type Query { hello: String }')
    vi.mocked(generateClientTypes).mockResolvedValue(undefined)
  })

  describe('server-enabled path', () => {
    it('should call both generateServerTypes and generateClientTypes', async () => {
      await regenerateTypes(mockNitro)

      expect(generateServerTypes).toHaveBeenCalledTimes(1)
      expect(generateClientTypes).toHaveBeenCalledTimes(1)
    })

    it('should pass nitro to generateServerTypes', async () => {
      await regenerateTypes(mockNitro)

      expect(generateServerTypes).toHaveBeenCalledWith(mockNitro, undefined)
    })

    it('should pass nitro to generateClientTypes', async () => {
      await regenerateTypes(mockNitro)

      expect(generateClientTypes).toHaveBeenCalledWith(
        mockNitro,
        undefined,
        'type Query { hello: String }',
      )
    })

    it('should pass schema string from server to client codegen', async () => {
      const schemaString = 'type Query { users: [User] }\ntype User { id: ID! name: String }'
      vi.mocked(generateServerTypes).mockResolvedValue(schemaString)

      await regenerateTypes(mockNitro)

      expect(generateClientTypes).toHaveBeenCalledWith(
        mockNitro,
        undefined,
        schemaString,
      )
    })

    it('should handle undefined schema string from server codegen', async () => {
      vi.mocked(generateServerTypes).mockResolvedValue(undefined)

      await regenerateTypes(mockNitro)

      expect(generateClientTypes).toHaveBeenCalledWith(
        mockNitro,
        undefined,
        undefined,
      )
    })

    it('should use explicit serverEnabled option over isServerEnabled', async () => {
      vi.mocked(isServerEnabled).mockReturnValue(false)

      await regenerateTypes(mockNitro, { serverEnabled: true })

      // Should still call generateServerTypes because explicit option overrides
      expect(generateServerTypes).toHaveBeenCalledTimes(1)
      expect(generateClientTypes).toHaveBeenCalledTimes(1)
    })
  })

  describe('server-disabled path', () => {
    it('should only call generateClientTypes when server is disabled', async () => {
      vi.mocked(isServerEnabled).mockReturnValue(false)

      await regenerateTypes(mockNitro)

      expect(generateServerTypes).not.toHaveBeenCalled()
      expect(generateClientTypes).toHaveBeenCalledTimes(1)
    })

    it('should not pass schema string when server is disabled', async () => {
      vi.mocked(isServerEnabled).mockReturnValue(false)

      await regenerateTypes(mockNitro)

      // Called with (nitro, opts) but no schemaString
      expect(generateClientTypes).toHaveBeenCalledWith(mockNitro, undefined)
    })

    it('should use explicit serverEnabled: false option', async () => {
      vi.mocked(isServerEnabled).mockReturnValue(true)

      await regenerateTypes(mockNitro, { serverEnabled: false })

      expect(generateServerTypes).not.toHaveBeenCalled()
      expect(generateClientTypes).toHaveBeenCalledTimes(1)
    })
  })

  describe('silent option', () => {
    it('should pass silent option to both codegen functions', async () => {
      await regenerateTypes(mockNitro, { silent: true })

      expect(generateServerTypes).toHaveBeenCalledWith(mockNitro, { silent: true })
      expect(generateClientTypes).toHaveBeenCalledWith(
        mockNitro,
        { silent: true },
        'type Query { hello: String }',
      )
    })

    it('should pass undefined opts when silent is false', async () => {
      await regenerateTypes(mockNitro, { silent: false })

      // silent: false results in opts = undefined (because the ternary checks truthiness)
      expect(generateServerTypes).toHaveBeenCalledWith(mockNitro, undefined)
      expect(generateClientTypes).toHaveBeenCalledWith(
        mockNitro,
        undefined,
        'type Query { hello: String }',
      )
    })

    it('should pass undefined opts when silent is not specified', async () => {
      await regenerateTypes(mockNitro)

      expect(generateServerTypes).toHaveBeenCalledWith(mockNitro, undefined)
    })

    it('should pass silent to client codegen when server is disabled', async () => {
      vi.mocked(isServerEnabled).mockReturnValue(false)

      await regenerateTypes(mockNitro, { silent: true })

      expect(generateClientTypes).toHaveBeenCalledWith(mockNitro, { silent: true })
    })
  })

  describe('default behavior', () => {
    it('should use isServerEnabled when no explicit serverEnabled option', async () => {
      vi.mocked(isServerEnabled).mockReturnValue(true)

      await regenerateTypes(mockNitro)

      expect(isServerEnabled).toHaveBeenCalledWith(mockNitro)
      expect(generateServerTypes).toHaveBeenCalled()
    })

    it('should handle empty options object', async () => {
      await regenerateTypes(mockNitro, {})

      expect(isServerEnabled).toHaveBeenCalledWith(mockNitro)
      expect(generateServerTypes).toHaveBeenCalledWith(mockNitro, undefined)
    })

    it('should handle no options argument', async () => {
      await regenerateTypes(mockNitro)

      expect(isServerEnabled).toHaveBeenCalledWith(mockNitro)
    })
  })

  describe('schema string pass-through', () => {
    it('should pass full schema string from server to client', async () => {
      const complexSchema = `
        type Query {
          users(limit: Int): [User!]!
          user(id: ID!): User
        }

        type Mutation {
          createUser(input: CreateUserInput!): User!
        }

        type User {
          id: ID!
          name: String!
          email: String!
        }

        input CreateUserInput {
          name: String!
          email: String!
        }
      `
      vi.mocked(generateServerTypes).mockResolvedValue(complexSchema)

      await regenerateTypes(mockNitro)

      expect(generateClientTypes).toHaveBeenCalledWith(
        mockNitro,
        undefined,
        complexSchema,
      )
    })

    it('should pass empty string schema through', async () => {
      vi.mocked(generateServerTypes).mockResolvedValue('')

      await regenerateTypes(mockNitro)

      expect(generateClientTypes).toHaveBeenCalledWith(
        mockNitro,
        undefined,
        '',
      )
    })
  })

  describe('error propagation', () => {
    it('should propagate errors from generateServerTypes', async () => {
      vi.mocked(generateServerTypes).mockRejectedValue(new Error('Server codegen failed'))

      await expect(regenerateTypes(mockNitro)).rejects.toThrow('Server codegen failed')
    })

    it('should propagate errors from generateClientTypes', async () => {
      vi.mocked(generateClientTypes).mockRejectedValue(new Error('Client codegen failed'))

      await expect(regenerateTypes(mockNitro)).rejects.toThrow('Client codegen failed')
    })

    it('should not call generateClientTypes if generateServerTypes fails', async () => {
      vi.mocked(generateServerTypes).mockRejectedValue(new Error('Server codegen failed'))

      await expect(regenerateTypes(mockNitro)).rejects.toThrow()

      expect(generateClientTypes).not.toHaveBeenCalled()
    })
  })
})
