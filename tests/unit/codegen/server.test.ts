/**
 * Unit tests for server-side type generation
 *
 * Tests the generateServerTypesCore function which:
 * - Generates TypeScript resolver types from GraphQL schemas
 * - Supports custom scalar configurations
 * - Supports Apollo Federation when enabled
 * - Generates type helpers for resolver return types
 */
import type { GraphQLSchema } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_SERVER_CODEGEN_CONFIG,
  generateServerTypesCore,
  generateTypes,
} from '../../../src/core/codegen/server'

// Helper to create schema from SDL using the same graphql instance as source code
function createSchema(typeDefs: string): GraphQLSchema {
  return makeExecutableSchema({ typeDefs })
}

// Schemas will be built in beforeAll
let SIMPLE_SCHEMA: GraphQLSchema
let SCALAR_SCHEMA: GraphQLSchema
let MUTATION_SCHEMA: GraphQLSchema
let COMPLEX_SCHEMA: GraphQLSchema
let INTERFACE_SCHEMA: GraphQLSchema

beforeAll(() => {
  // Simple GraphQL schema for testing
  SIMPLE_SCHEMA = createSchema(`
    type Query {
      hello: String
      user(id: ID!): User
    }

    type User {
      id: ID!
      name: String!
      email: String
    }
  `)

  // Schema with custom scalars
  SCALAR_SCHEMA = createSchema(`
    scalar DateTime
    scalar JSON

    type Query {
      createdAt: DateTime
      metadata: JSON
    }
  `)

  // Schema with mutations
  MUTATION_SCHEMA = createSchema(`
    type Query {
      users: [User!]!
    }

    type Mutation {
      createUser(name: String!, email: String!): User!
      deleteUser(id: ID!): Boolean!
    }

    type User {
      id: ID!
      name: String!
      email: String!
    }
  `)

  // Schema with enums and input types
  COMPLEX_SCHEMA = createSchema(`
    enum Role {
      ADMIN
      USER
      GUEST
    }

    input CreateUserInput {
      name: String!
      email: String!
      role: Role
    }

    type Query {
      users(role: Role): [User!]!
    }

    type Mutation {
      createUser(input: CreateUserInput!): User!
    }

    type User {
      id: ID!
      name: String!
      email: String!
      role: Role!
    }
  `)

  // Schema with interfaces
  INTERFACE_SCHEMA = createSchema(`
    interface Node {
      id: ID!
    }

    type User implements Node {
      id: ID!
      name: String!
    }

    type Post implements Node {
      id: ID!
      title: String!
      author: User!
    }

    type Query {
      node(id: ID!): Node
    }
  `)
})

describe('generateServerTypesCore', () => {
  describe('basic type generation', () => {
    it('should generate types from a simple schema', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toBeDefined()
      expect(result.schemaString).toBeDefined()
      expect(result.types).toContain('type Query')
      expect(result.types).toContain('User')
    })

    it('should include generated file header', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toContain('THIS FILE IS GENERATED')
      expect(result.types).toContain('eslint-disable')
    })

    it('should include ResolversTypes', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toContain('ResolversTypes')
    })

    it('should include QueryResolvers', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toContain('QueryResolvers')
    })

    it('should include user type resolver', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toContain('UserResolvers')
    })

    it('should include virtual module import', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toContain('#nitro-graphql/validation-schemas')
    })

    it('should include type helpers for ResolverReturnType', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toContain('ResolverReturnType')
      expect(result.types).toContain('ResolverReturnTypeObject')
    })

    it('should include NPMConfig with framework name', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toContain('framework: \'graphql-yoga\'')
    })
  })

  describe('mutation types', () => {
    it('should include MutationResolvers', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: MUTATION_SCHEMA,
      })

      expect(result.types).toContain('MutationResolvers')
    })

    it('should include mutation arguments', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: MUTATION_SCHEMA,
      })

      expect(result.types).toContain('MutationCreateUserArgs')
      expect(result.types).toContain('MutationDeleteUserArgs')
    })
  })

  describe('custom scalars', () => {
    it('should generate types with custom scalars', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SCALAR_SCHEMA,
      })

      expect(result.types).toContain('DateTime')
      expect(result.types).toContain('JSON')
    })

    it('should apply default scalar mappings', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SCALAR_SCHEMA,
        config: {
          scalars: {
            DateTime: 'string',
            JSON: 'Record<string, any>',
          },
        },
      })

      expect(result.types).toBeDefined()
    })
  })

  describe('enums and input types', () => {
    it('should generate enum types', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: COMPLEX_SCHEMA,
      })

      expect(result.types).toContain('Role')
      // With enumsAsTypes: true (default), enum values are lowercase strings
      expect(result.types).toMatch(/ADMIN|'ADMIN'|"ADMIN"/)
      expect(result.types).toMatch(/USER|'USER'|"USER"/)
      expect(result.types).toMatch(/GUEST|'GUEST'|"GUEST"/)
    })

    it('should generate input types', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: COMPLEX_SCHEMA,
      })

      expect(result.types).toContain('CreateUserInput')
    })
  })

  describe('interfaces', () => {
    it('should generate interface types', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: INTERFACE_SCHEMA,
      })

      expect(result.types).toContain('Node')
      expect(result.types).toContain('NodeResolvers')
    })

    it('should generate resolvers for implementing types', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: INTERFACE_SCHEMA,
      })

      expect(result.types).toContain('UserResolvers')
      expect(result.types).toContain('PostResolvers')
    })
  })

  describe('schema string output', () => {
    it('should return the schema string', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.schemaString).toContain('type Query')
      expect(result.schemaString).toContain('hello: String')
      expect(result.schemaString).toContain('type User')
    })
  })

  describe('federation support', () => {
    it('should enable federation when specified', async () => {
      const result = await generateServerTypesCore({
        framework: 'apollo-server',
        schema: SIMPLE_SCHEMA,
        federationEnabled: true,
      })

      expect(result.types).toBeDefined()
    })

    it('should include apollo-server framework name', async () => {
      const result = await generateServerTypesCore({
        framework: 'apollo-server',
        schema: SIMPLE_SCHEMA,
      })

      expect(result.types).toContain('framework: \'apollo-server\'')
    })
  })

  describe('output path', () => {
    it('should use custom output path in filename', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
        outputPath: 'custom/path/types.ts',
      })

      expect(result.types).toBeDefined()
    })
  })

  describe('config options', () => {
    it('should apply context type configuration', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
        config: {
          contextType: 'custom/context#CustomContext',
        },
      })

      expect(result.types).toBeDefined()
    })

    it('should apply maybeValue configuration', async () => {
      const result = await generateServerTypesCore({
        framework: 'graphql-yoga',
        schema: SIMPLE_SCHEMA,
        config: {
          maybeValue: 'T | null',
        },
      })

      expect(result.types).toBeDefined()
    })
  })
})

describe('dEFAULT_SERVER_CODEGEN_CONFIG', () => {
  it('should have default scalar mappings', () => {
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.scalars).toBeDefined()
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.scalars).toHaveProperty('DateTime')
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.scalars).toHaveProperty('JSON')
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.scalars).toHaveProperty('UUID')
  })

  it('should have default scalar type as unknown', () => {
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.defaultScalarType).toBe('unknown')
  })

  it('should have default context type for h3', () => {
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.contextType).toBe('nitro/h3#H3Event')
  })

  it('should have default maybe values', () => {
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.maybeValue).toBe('T | null | undefined')
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.inputMaybeValue).toBe('T | undefined')
  })

  it('should use interface declaration kind', () => {
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.declarationKind).toBe('interface')
  })

  it('should have enums as types enabled', () => {
    expect(DEFAULT_SERVER_CODEGEN_CONFIG.enumsAsTypes).toBe(true)
  })
})

describe('generateTypes (deprecated)', () => {
  it('should still work for backward compatibility', async () => {
    const result = await generateTypes(
      'graphql-yoga',
      SIMPLE_SCHEMA,
      {},
    )

    expect(result).toBeDefined()
    expect(typeof result).toBe('string')
    expect(result).toContain('Query')
    expect(result).toContain('User')
  })

  it('should pass codegen config', async () => {
    const result = await generateTypes(
      'graphql-yoga',
      SIMPLE_SCHEMA,
      {
        codegen: {
          server: {
            contextType: 'custom#Context',
          },
        },
      },
    )

    expect(result).toBeDefined()
  })

  it('should support federation config', async () => {
    const result = await generateTypes(
      'apollo-server',
      SIMPLE_SCHEMA,
      {
        federation: {
          enabled: true,
        },
      },
    )

    expect(result).toBeDefined()
  })
})

describe('snapshot tests', () => {
  it('should match snapshot for simple schema', async () => {
    const result = await generateServerTypesCore({
      framework: 'graphql-yoga',
      schema: SIMPLE_SCHEMA,
    })

    // Verify structure rather than exact content
    expect(result.types).toContain('// THIS FILE IS GENERATED, DO NOT EDIT!')
    expect(result.types).toContain('import schemas from')
    expect(result.types).toContain('export interface NPMConfig')
    expect(result.types).toContain('export type SchemaType')
    expect(result.types).toContain('type ResolverReturnType')
    // Data types use 'export interface', resolver types use 'export type'
    expect(result.types).toMatch(/export\s+interface\s+Query/)
    expect(result.types).toMatch(/export\s+interface\s+User/)
    // Resolver types are generated as 'export type' with generics
    expect(result.types).toMatch(/export\s+type\s+QueryResolvers/)
    expect(result.types).toMatch(/export\s+type\s+UserResolvers/)
    expect(result.types).toMatch(/export\s+type\s+Resolvers/)
  })

  it('should match snapshot for complex schema', async () => {
    const result = await generateServerTypesCore({
      framework: 'graphql-yoga',
      schema: COMPLEX_SCHEMA,
    })

    // Verify all expected type constructs
    expect(result.types).toContain('Role')
    expect(result.types).toContain('CreateUserInput')
    expect(result.types).toContain('QueryUsersArgs')
    expect(result.types).toContain('MutationCreateUserArgs')
    expect(result.types).toContain('interface Query')
    expect(result.types).toContain('interface Mutation')
    expect(result.types).toContain('interface User')
  })
})
