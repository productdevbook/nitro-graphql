/**
 * Unit tests for client-side type generation
 *
 * Tests the generateClientTypesCore function which:
 * - Generates TypeScript types from GraphQL schemas and documents
 * - Generates SDK code for GraphQL operations
 * - Supports external service type generation
 * - Handles schema-only generation (no documents)
 */
import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'
import { makeExecutableSchema } from '@graphql-tools/schema'
import { parse } from 'graphql'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  DEFAULT_CLIENT_CODEGEN_CONFIG,
  generateClientTypesCore,
  generateExternalClientTypesCore,
} from '../../../src/core/codegen/client'

// Helper to create schema from SDL using the same graphql instance as source code
function createSchema(typeDefs: string): GraphQLSchema {
  return makeExecutableSchema({ typeDefs })
}

// Schema will be built in beforeAll
let SIMPLE_SCHEMA: GraphQLSchema

// Create a mock document source
function createDocument(query: string, filename = 'test.graphql'): Source {
  return {
    document: parse(query),
    location: filename,
    rawSDL: query,
  }
}

// Sample query documents - will be created in beforeAll
let HELLO_QUERY: Source
let USER_QUERY: Source
let USERS_QUERY: Source
let CREATE_USER_MUTATION: Source
let NESTED_QUERY: Source
let FRAGMENT_QUERY: Source

beforeAll(() => {
  // Simple GraphQL schema for testing
  SIMPLE_SCHEMA = createSchema(`
    type Query {
      hello: String
      user(id: ID!): User
      users: [User!]!
    }

    type Mutation {
      createUser(name: String!, email: String!): User!
    }

    type User {
      id: ID!
      name: String!
      email: String
      posts: [Post!]!
    }

    type Post {
      id: ID!
      title: String!
      content: String
      author: User!
    }
  `)

  // Sample query documents
  HELLO_QUERY = createDocument(`
    query HelloQuery {
      hello
    }
  `, 'hello.graphql')

  USER_QUERY = createDocument(`
    query GetUser($id: ID!) {
      user(id: $id) {
        id
        name
        email
      }
    }
  `, 'user.graphql')

  USERS_QUERY = createDocument(`
    query GetUsers {
      users {
        id
        name
      }
    }
  `, 'users.graphql')

  CREATE_USER_MUTATION = createDocument(`
    mutation CreateUser($name: String!, $email: String!) {
      createUser(name: $name, email: $email) {
        id
        name
        email
      }
    }
  `, 'createUser.graphql')

  NESTED_QUERY = createDocument(`
    query GetUserWithPosts($id: ID!) {
      user(id: $id) {
        id
        name
        posts {
          id
          title
          content
        }
      }
    }
  `, 'userWithPosts.graphql')

  FRAGMENT_QUERY = createDocument(`
    fragment UserFields on User {
      id
      name
      email
    }

    query GetUserWithFragment($id: ID!) {
      user(id: $id) {
        ...UserFields
      }
    }
  `, 'userFragment.graphql')
})

describe('generateClientTypesCore', () => {
  describe('basic type generation with documents', () => {
    it('should generate types from schema and documents', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toBeDefined()
        expect(result.sdk).toBeDefined()
      }
    })

    it('should include generated file header', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('THIS FILE IS GENERATED')
        expect(result.types).toContain('eslint-disable')
      }
    })

    it('should generate query types', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('HelloQuery')
      }
    })

    it('should generate query variable types', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [USER_QUERY],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('GetUserQueryVariables')
        expect(result.types).toContain('GetUserQuery')
      }
    })

    it('should generate mutation types', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [CREATE_USER_MUTATION],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('CreateUserMutation')
        expect(result.types).toContain('CreateUserMutationVariables')
      }
    })
  })

  describe('return false for empty documents (non-external)', () => {
    it('should return false when no documents and no service name', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [],
      })

      expect(result).toBe(false)
    })
  })

  describe('schema-only generation (external services)', () => {
    it('should generate types without documents for external services', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [],
        serviceName: 'external-api',
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toBeDefined()
        expect(result.sdk).toBeDefined()
      }
    })

    it('should generate generic SDK for schema-only generation', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [],
        serviceName: 'external-api',
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.sdk).toContain('Requester')
        expect(result.sdk).toContain('getSdk')
        expect(result.sdk).toContain('Sdk')
      }
    })

    it('should include base types in schema-only generation', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [],
        serviceName: 'external-api',
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('Query')
        expect(result.types).toContain('User')
        expect(result.types).toContain('Post')
      }
    })
  })

  describe('multiple documents', () => {
    it('should generate types for multiple documents', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY, USER_QUERY, USERS_QUERY],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('HelloQuery')
        expect(result.types).toContain('GetUserQuery')
        expect(result.types).toContain('GetUsersQuery')
      }
    })

    it('should generate types for mixed queries and mutations', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [USER_QUERY, CREATE_USER_MUTATION],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('GetUserQuery')
        expect(result.types).toContain('CreateUserMutation')
      }
    })
  })

  describe('nested types', () => {
    it('should generate types for nested selections', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [NESTED_QUERY],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('GetUserWithPostsQuery')
      }
    })
  })

  describe('fragments', () => {
    it('should generate types for fragments', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [FRAGMENT_QUERY],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.types).toContain('UserFieldsFragment')
      }
    })
  })

  describe('sDK generation', () => {
    it('should generate SDK with operations', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [USER_QUERY, CREATE_USER_MUTATION],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.sdk).toBeDefined()
        expect(result.sdk).toContain('getSdk')
        expect(result.sdk).toContain('Requester')
      }
    })

    it('should include operation functions in SDK', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.sdk).toContain('HelloQuery')
      }
    })
  })

  describe('configuration options', () => {
    it('should apply custom config', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
        config: {
          enumsAsTypes: false,
        },
      })

      expect(result).not.toBe(false)
    })

    it('should apply custom SDK config', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
        sdkConfig: {
          rawRequest: false,
        },
      })

      expect(result).not.toBe(false)
    })

    it('should use virtual types path for imports', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
        virtualTypesPath: '#graphql/custom',
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.sdk).toContain('#graphql/custom')
      }
    })

    it('should use service name for default types path', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
        serviceName: 'my-service',
      })

      expect(result).not.toBe(false)
      if (result) {
        expect(result.sdk).toContain('#graphql/client/my-service')
      }
    })
  })

  describe('output path', () => {
    it('should accept custom output path', async () => {
      const result = await generateClientTypesCore({
        schema: SIMPLE_SCHEMA,
        documents: [HELLO_QUERY],
        outputPath: 'custom/path/types.ts',
      })

      expect(result).not.toBe(false)
    })
  })
})

describe('generateExternalClientTypesCore', () => {
  it('should generate types for external service', async () => {
    const result = await generateExternalClientTypesCore(
      {
        name: 'github',
        schema: 'https://api.github.com/graphql',
        endpoint: 'https://api.github.com/graphql',
      },
      SIMPLE_SCHEMA,
      [USER_QUERY],
    )

    expect(result).not.toBe(false)
    if (result) {
      expect(result.types).toBeDefined()
      expect(result.sdk).toBeDefined()
    }
  })

  it('should apply service-specific codegen config', async () => {
    const result = await generateExternalClientTypesCore(
      {
        name: 'github',
        schema: 'https://api.github.com/graphql',
        endpoint: 'https://api.github.com/graphql',
        codegen: {
          client: {
            enumsAsTypes: false,
          },
        },
      },
      SIMPLE_SCHEMA,
      [USER_QUERY],
    )

    expect(result).not.toBe(false)
  })

  it('should use virtual types path when provided', async () => {
    const result = await generateExternalClientTypesCore(
      {
        name: 'github',
        schema: 'https://api.github.com/graphql',
        endpoint: 'https://api.github.com/graphql',
      },
      SIMPLE_SCHEMA,
      [USER_QUERY],
      '#graphql/external/github',
    )

    expect(result).not.toBe(false)
    if (result) {
      expect(result.sdk).toContain('#graphql/external/github')
    }
  })

  it('should handle schema-only external service', async () => {
    const result = await generateExternalClientTypesCore(
      {
        name: 'github',
        schema: 'https://api.github.com/graphql',
        endpoint: 'https://api.github.com/graphql',
      },
      SIMPLE_SCHEMA,
      [],
    )

    expect(result).not.toBe(false)
    if (result) {
      expect(result.types).toBeDefined()
      expect(result.sdk).toBeDefined()
    }
  })
})

describe('dEFAULT_CLIENT_CODEGEN_CONFIG', () => {
  it('should have ESM imports disabled for legacy', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.emitLegacyCommonJSImports).toBe(false)
  })

  it('should use type imports', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.useTypeImports).toBe(true)
  })

  it('should have enums as types enabled', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.enumsAsTypes).toBe(true)
  })

  it('should have strict scalars enabled', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.strictScalars).toBe(true)
  })

  it('should have correct maybe values', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.maybeValue).toBe('T | null | undefined')
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.inputMaybeValue).toBe('T | undefined')
  })

  it('should use string document mode', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.documentMode).toBe('string')
  })

  it('should have pure magic comment enabled', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.pureMagicComment).toBe(true)
  })

  it('should dedupe operation suffix', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.dedupeOperationSuffix).toBe(true)
  })

  it('should have raw request enabled', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.rawRequest).toBe(true)
  })

  it('should have default scalar mappings', () => {
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.scalars).toBeDefined()
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.scalars).toHaveProperty('DateTime')
    expect(DEFAULT_CLIENT_CODEGEN_CONFIG.scalars).toHaveProperty('JSON')
  })
})

describe('snapshot tests', () => {
  it('should match snapshot for simple query', async () => {
    const result = await generateClientTypesCore({
      schema: SIMPLE_SCHEMA,
      documents: [HELLO_QUERY],
    })

    expect(result).not.toBe(false)
    if (result) {
      // Verify structure
      expect(result.types).toContain('// THIS FILE IS GENERATED, DO NOT EDIT!')
      expect(result.types).toContain('HelloQuery')
      expect(result.types).toContain('Scalars')
      expect(result.types).toContain('Query')
    }
  })

  it('should match snapshot for query with variables', async () => {
    const result = await generateClientTypesCore({
      schema: SIMPLE_SCHEMA,
      documents: [USER_QUERY],
    })

    expect(result).not.toBe(false)
    if (result) {
      expect(result.types).toContain('GetUserQuery')
      expect(result.types).toContain('GetUserQueryVariables')
      expect(result.types).toContain('id')
    }
  })

  it('should match snapshot for mutation', async () => {
    const result = await generateClientTypesCore({
      schema: SIMPLE_SCHEMA,
      documents: [CREATE_USER_MUTATION],
    })

    expect(result).not.toBe(false)
    if (result) {
      expect(result.types).toContain('CreateUserMutation')
      expect(result.types).toContain('CreateUserMutationVariables')
      expect(result.types).toContain('name')
      expect(result.types).toContain('email')
    }
  })

  it('should match snapshot for schema-only (external service)', async () => {
    const result = await generateClientTypesCore({
      schema: SIMPLE_SCHEMA,
      documents: [],
      serviceName: 'external',
    })

    expect(result).not.toBe(false)
    if (result) {
      expect(result.types).toContain('Query')
      expect(result.types).toContain('Mutation')
      expect(result.types).toContain('User')
      expect(result.types).toContain('Post')
      expect(result.sdk).toContain('getSdk')
      expect(result.sdk).toContain('Requester')
    }
  })

  it('should match snapshot for SDK output', async () => {
    const result = await generateClientTypesCore({
      schema: SIMPLE_SCHEMA,
      documents: [HELLO_QUERY, USER_QUERY],
    })

    expect(result).not.toBe(false)
    if (result) {
      // Verify SDK structure
      expect(result.sdk).toContain('// THIS FILE IS GENERATED, DO NOT EDIT!')
      expect(result.sdk).toContain('getSdk')
      expect(result.sdk).toContain('Requester')
      expect(result.sdk).toContain('HelloQuery')
      expect(result.sdk).toContain('GetUser')
    }
  })
})
