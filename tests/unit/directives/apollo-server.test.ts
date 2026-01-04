/**
 * Directive transformer tests for Apollo Server
 *
 * Tests that directive transformers work correctly with @apollo/server.
 * Uses createMergedSchema() - same function used by Nitro's apollo-server route.
 */
import { ApolloServer } from '@apollo/server'
import { describe, expect, it } from 'vitest'
import { createTestSchema } from './helpers'

/** Execute a GraphQL query using Apollo Server */
async function execute(schema: Awaited<ReturnType<typeof createTestSchema>>, query: string) {
  const server = new ApolloServer({ schema })
  await server.start()
  try {
    const result = await server.executeOperation({ query })
    if (result.body.kind === 'single') {
      return {
        data: result.body.singleResult.data as Record<string, unknown> | undefined,
        errors: result.body.singleResult.errors,
      }
    }
    return { data: undefined, errors: undefined }
  }
  finally {
    await server.stop()
  }
}

describe('directive transformer (Apollo Server)', () => {
  it('should apply @upper transformer to field resolution', async () => {
    const schema = await createTestSchema(
      'greeting: String! @upper',
      { greeting: () => 'hello world' },
    )

    const result = await execute(schema, '{ greeting }')

    expect(result.errors).toBeUndefined()
    expect(result.data?.greeting).toBe('HELLO WORLD')
  })

  it('should not affect fields without @upper directive', async () => {
    const schema = await createTestSchema(
      `upper: String! @upper
       normal: String!`,
      {
        upper: () => 'should be uppercase',
        normal: () => 'should stay lowercase',
      },
    )

    const result = await execute(schema, '{ upper normal }')

    expect(result.errors).toBeUndefined()
    expect(result.data?.upper).toBe('SHOULD BE UPPERCASE')
    expect(result.data?.normal).toBe('should stay lowercase')
  })

  it('should work with async resolvers', async () => {
    const schema = await createTestSchema(
      'asyncGreeting: String! @upper',
      {
        asyncGreeting: async () => {
          await new Promise(resolve => setTimeout(resolve, 10))
          return 'async hello'
        },
      },
    )

    const result = await execute(schema, '{ asyncGreeting }')

    expect(result.errors).toBeUndefined()
    expect(result.data?.asyncGreeting).toBe('ASYNC HELLO')
  })
})
