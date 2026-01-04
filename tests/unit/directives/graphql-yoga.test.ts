/**
 * Directive transformer tests for GraphQL Yoga
 *
 * Tests that directive transformers work correctly with graphql-yoga.
 * Uses createMergedSchema() - same function used by Nitro's graphql-yoga route.
 */
import { createYoga } from 'graphql-yoga'
import { describe, expect, it } from 'vitest'
import { createTestSchema } from './helpers'

/** Execute a GraphQL query using Yoga */
async function execute(schema: Awaited<ReturnType<typeof createTestSchema>>, query: string) {
  const yoga = createYoga({ schema })
  const response = await yoga.fetch('http://localhost/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  return response.json() as Promise<{ data?: Record<string, unknown>, errors?: unknown[] }>
}

describe('directive transformer (GraphQL Yoga)', () => {
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

  it('should handle non-string values gracefully', async () => {
    const schema = await createTestSchema(
      'number: Int! @upper',
      { number: () => 42 },
    )

    const result = await execute(schema, '{ number }')

    expect(result.errors).toBeUndefined()
    expect(result.data?.number).toBe(42)
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
