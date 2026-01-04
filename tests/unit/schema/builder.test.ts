/**
 * Schema builder tests
 *
 * Tests for createMergedSchema() which:
 * 1. Merges multiple GraphQL schemas (typeDefs)
 * 2. Merges multiple resolvers
 * 3. Applies directive transformers
 * 4. Supports Apollo Federation (optional)
 */
import type { GraphQLSchema } from 'graphql'
import type {
  DirectiveWrapper,
  ResolverDefinition,
  SchemaDefinition,
} from '../../../src/core/schema/builder'
import type { DirectiveDefinition } from '../../../src/core/types/define'
import { createYoga } from 'graphql-yoga'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createMergedSchema } from '../../../src/core/schema/builder'
import { resetFederationCache } from '../../../src/core/schema/federation'

// Import graphql-tools for directive testing (uses same graphql instance as createMergedSchema)
const { defaultFieldResolver } = await import('graphql')
const { getDirective, MapperKind, mapSchema } = await import('@graphql-tools/utils')

/** Get schema SDL via introspection query using Yoga */
async function getSchemaSDL(schema: GraphQLSchema): Promise<string> {
  const query = `{
    __schema {
      types {
        name
        fields {
          name
          deprecationReason
        }
      }
      subscriptionType {
        name
      }
    }
  }`
  const result = await execute(schema, query)
  return JSON.stringify(result.data)
}

/** Execute a GraphQL query using Yoga */
async function execute(
  schema: GraphQLSchema,
  query: string,
): Promise<{ data?: Record<string, unknown>, errors?: unknown[] }> {
  const yoga = createYoga({ schema })
  const response = await yoga.fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return response.json() as Promise<{ data?: Record<string, unknown>, errors?: unknown[] }>
}

/** Helper to create a basic schema definition */
function createSchema(def: string): SchemaDefinition {
  return { def }
}

/** Helper to create a resolver definition */
function createResolver(resolver: Record<string, unknown>): ResolverDefinition {
  return { resolver }
}

/** Helper to create a directive wrapper */
function createDirectiveWrapper(directive: DirectiveDefinition): DirectiveWrapper {
  return { directive }
}

/** @upper directive for testing - transforms string fields to uppercase */
const upperDirective: DirectiveDefinition = {
  name: 'upper',
  locations: ['FIELD_DEFINITION'],
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, 'upper')?.[0]
        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig
          fieldConfig.resolve = async (source, args, context, info) => {
            const result = await resolve(source, args, context, info)
            return typeof result === 'string' ? result.toUpperCase() : result
          }
        }
        return fieldConfig
      },
    })
  },
}

/** @deprecated directive for testing - marks fields as deprecated */
const deprecatedTransformerDirective: DirectiveDefinition = {
  name: 'customDeprecated',
  locations: ['FIELD_DEFINITION'],
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, 'customDeprecated')?.[0]
        if (directive) {
          fieldConfig.deprecationReason = directive.reason || 'Deprecated'
        }
        return fieldConfig
      },
    })
  },
}

describe('createMergedSchema', () => {
  afterEach(() => {
    // Reset federation cache between tests
    resetFederationCache()
  })

  describe('single schema with resolvers', () => {
    it('should merge a single schema with resolvers', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
          }),
        ],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ hello }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBe('world')
    })

    it('should support complex types', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type User {
              id: ID!
              name: String!
              email: String!
            }

            type Query {
              user(id: ID!): User
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              user: (_: unknown, { id }: { id: string }) => ({
                id,
                name: 'John Doe',
                email: 'john@example.com',
              }),
            },
          }),
        ],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ user(id: "1") { id name email } }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.user).toEqual({
        id: '1',
        name: 'John Doe',
        email: 'john@example.com',
      })
    })
  })

  describe('multiple schemas', () => {
    it('should merge multiple schemas together', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              users: [User!]!
            }

            type User {
              id: ID!
              name: String!
            }
          `),
          createSchema(`
            extend type Query {
              posts: [Post!]!
            }

            type Post {
              id: ID!
              title: String!
              author: User
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              users: () => [{ id: '1', name: 'Alice' }],
              posts: () => [{ id: '1', title: 'Hello World', author: { id: '1', name: 'Alice' } }],
            },
          }),
        ],
        moduleConfig: {},
      })

      const result = await execute(schema, `
        {
          users { id name }
          posts { id title author { name } }
        }
      `)

      expect(result.errors).toBeUndefined()
      expect(result.data?.users).toEqual([{ id: '1', name: 'Alice' }])
      expect(result.data?.posts).toEqual([
        { id: '1', title: 'Hello World', author: { name: 'Alice' } },
      ])
    })

    it('should merge schemas from different resolver files', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              users: [User!]!
              posts: [Post!]!
            }

            type User {
              id: ID!
              name: String!
            }

            type Post {
              id: ID!
              title: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              users: () => [{ id: '1', name: 'Bob' }],
            },
          }),
          createResolver({
            Query: {
              posts: () => [{ id: '1', title: 'First Post' }],
            },
          }),
        ],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ users { name } posts { title } }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.users).toEqual([{ name: 'Bob' }])
      expect(result.data?.posts).toEqual([{ title: 'First Post' }])
    })
  })

  describe('directive transformers', () => {
    it('should apply directive transformers to schema', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            directive @upper on FIELD_DEFINITION

            type Query {
              greeting: String! @upper
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              greeting: () => 'hello world',
            },
          }),
        ],
        directives: [createDirectiveWrapper(upperDirective)],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ greeting }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.greeting).toBe('HELLO WORLD')
    })

    it('should apply multiple directive transformers', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            directive @upper on FIELD_DEFINITION
            directive @customDeprecated(reason: String) on FIELD_DEFINITION

            type Query {
              greeting: String! @upper
              oldField: String! @customDeprecated(reason: "Use newField instead")
              newField: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              greeting: () => 'hello',
              oldField: () => 'old',
              newField: () => 'new',
            },
          }),
        ],
        directives: [
          createDirectiveWrapper(upperDirective),
          createDirectiveWrapper(deprecatedTransformerDirective),
        ],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ greeting }')
      expect(result.data?.greeting).toBe('HELLO')

      // Check that deprecation was applied via introspection
      const deprecationQuery = `{
        __type(name: "Query") {
          fields(includeDeprecated: true) {
            name
            deprecationReason
          }
        }
      }`
      const deprecationResult = await execute(schema, deprecationQuery)
      const fields = (deprecationResult.data as any)?.__type?.fields
      const oldField = fields?.find((f: any) => f.name === 'oldField')
      expect(oldField?.deprecationReason).toBe('Use newField instead')
    })

    it('should skip directives without transformer', async () => {
      const directiveWithoutTransformer: DirectiveDefinition = {
        name: 'noOp',
        locations: ['FIELD_DEFINITION'],
        // No transformer defined
      }

      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            directive @noOp on FIELD_DEFINITION

            type Query {
              hello: String! @noOp
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
          }),
        ],
        directives: [createDirectiveWrapper(directiveWithoutTransformer)],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ hello }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBe('world')
    })
  })

  describe('empty arrays', () => {
    it('should handle empty schemas array gracefully', async () => {
      // Empty schemas array should throw as there's no valid schema
      await expect(
        createMergedSchema({
          schemas: [],
          resolvers: [],
          moduleConfig: {},
        }),
      ).rejects.toThrow()
    })

    it('should handle empty resolvers array', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String
            }
          `),
        ],
        resolvers: [],
        moduleConfig: {},
      })

      // Schema should be created but query will return null (no resolver)
      const result = await execute(schema, '{ hello }')
      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBeNull()
    })

    it('should handle empty directives array', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
          }),
        ],
        directives: [],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ hello }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBe('world')
    })

    it('should handle undefined directives', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
          }),
        ],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ hello }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBe('world')
    })
  })

  describe('federation support', () => {
    it('should use regular schema when federation is disabled', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
          }),
        ],
        moduleConfig: {
          federation: {
            enabled: false,
          },
        },
      })

      const result = await execute(schema, '{ hello }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBe('world')
    })

    it('should use regular schema when federation config is empty', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
          }),
        ],
        moduleConfig: {
          federation: {},
        },
      })

      const result = await execute(schema, '{ hello }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBe('world')
    })

    it('should fall back to regular schema when @apollo/subgraph is not available', async () => {
      // Mock the federation module to simulate @apollo/subgraph not being installed
      vi.mock('../../../src/core/schema/federation', async (importOriginal) => {
        const original = await importOriginal<typeof import('../../../src/core/schema/federation')>()
        return {
          ...original,
          loadFederationSupport: vi.fn().mockResolvedValue(false),
          warnFederationUnavailable: vi.fn(),
        }
      })

      // Re-import to get mocked version
      const { createMergedSchema: mockedCreateMergedSchema } = await import('../../../src/core/schema/builder')

      const schema = await mockedCreateMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
          }),
        ],
        moduleConfig: {
          federation: {
            enabled: true,
          },
        },
      })

      const result = await execute(schema, '{ hello }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBe('world')

      vi.resetModules()
      vi.restoreAllMocks()
    })
  })

  describe('error handling', () => {
    it('should throw error for invalid schema syntax', async () => {
      await expect(
        createMergedSchema({
          schemas: [
            createSchema(`
              type Query {
                hello String!
              }
            `),
          ],
          resolvers: [],
          moduleConfig: {},
        }),
      ).rejects.toThrow()
    })

    it('should merge non-conflicting field definitions from same-named types', async () => {
      // Note: mergeTypeDefs with throwOnConflict only throws when fields conflict
      // When types have different fields, they are merged together
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String!
            }

            type User {
              id: ID!
              name: String!
            }
          `),
          createSchema(`
            extend type Query {
              world: String!
            }

            extend type User {
              email: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'hello',
              world: () => 'world',
            },
          }),
        ],
        moduleConfig: {},
      })

      // Verify both fields are available
      const result = await execute(schema, '{ hello world }')
      expect(result.errors).toBeUndefined()
      expect(result.data?.hello).toBe('hello')
      expect(result.data?.world).toBe('world')
    })

    it('should throw error when same field is defined differently', async () => {
      // This should throw because the same field 'hello' is defined with different types
      await expect(
        createMergedSchema({
          schemas: [
            createSchema(`
              type Query {
                hello: String!
              }
            `),
            createSchema(`
              type Query {
                hello: Int!
              }
            `),
          ],
          resolvers: [],
          moduleConfig: {},
        }),
      ).rejects.toThrow()
    })

    it('should handle resolver errors gracefully', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              error: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              error: () => {
                throw new Error('Resolver error')
              },
            },
          }),
        ],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ error }')

      expect(result.errors).toBeDefined()
      expect(result.errors?.length).toBeGreaterThan(0)
    })
  })

  describe('mutations and subscriptions', () => {
    it('should support mutation resolvers', async () => {
      const users: { id: string, name: string }[] = []

      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type User {
              id: ID!
              name: String!
            }

            type Query {
              users: [User!]!
            }

            type Mutation {
              createUser(name: String!): User!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              users: () => users,
            },
            Mutation: {
              createUser: (_: unknown, { name }: { name: string }) => {
                const user = { id: String(users.length + 1), name }
                users.push(user)
                return user
              },
            },
          }),
        ],
        moduleConfig: {},
      })

      const mutationResult = await execute(
        schema,
        'mutation { createUser(name: "Alice") { id name } }',
      )

      expect(mutationResult.errors).toBeUndefined()
      expect(mutationResult.data?.createUser).toEqual({ id: '1', name: 'Alice' })

      const queryResult = await execute(schema, '{ users { id name } }')
      expect(queryResult.data?.users).toEqual([{ id: '1', name: 'Alice' }])
    })

    it('should support subscription type definitions', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            type Query {
              hello: String!
            }

            type Subscription {
              messageAdded: String!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
            Subscription: {
              messageAdded: {
                subscribe: () => ({ messageAdded: 'test' }),
              },
            },
          }),
        ],
        moduleConfig: {},
      })

      // Verify schema was created with subscription type via introspection
      const schemaInfo = await getSchemaSDL(schema)
      expect(schemaInfo).toContain('"subscriptionType":{"name":"Subscription"}')
      expect(schemaInfo).toContain('"name":"messageAdded"')
    })
  })

  describe('input types and enums', () => {
    it('should support input types', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            input CreateUserInput {
              name: String!
              email: String!
            }

            type User {
              id: ID!
              name: String!
              email: String!
            }

            type Query {
              hello: String!
            }

            type Mutation {
              createUser(input: CreateUserInput!): User!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              hello: () => 'world',
            },
            Mutation: {
              createUser: (_: unknown, { input }: { input: { name: string, email: string } }) => ({
                id: '1',
                ...input,
              }),
            },
          }),
        ],
        moduleConfig: {},
      })

      const result = await execute(
        schema,
        `mutation {
          createUser(input: { name: "Bob", email: "bob@example.com" }) {
            id name email
          }
        }`,
      )

      expect(result.errors).toBeUndefined()
      expect(result.data?.createUser).toEqual({
        id: '1',
        name: 'Bob',
        email: 'bob@example.com',
      })
    })

    it('should support enum types', async () => {
      const schema = await createMergedSchema({
        schemas: [
          createSchema(`
            enum Status {
              ACTIVE
              INACTIVE
              PENDING
            }

            type User {
              id: ID!
              status: Status!
            }

            type Query {
              user: User!
            }
          `),
        ],
        resolvers: [
          createResolver({
            Query: {
              user: () => ({ id: '1', status: 'ACTIVE' }),
            },
          }),
        ],
        moduleConfig: {},
      })

      const result = await execute(schema, '{ user { id status } }')

      expect(result.errors).toBeUndefined()
      expect(result.data?.user).toEqual({ id: '1', status: 'ACTIVE' })
    })
  })
})
