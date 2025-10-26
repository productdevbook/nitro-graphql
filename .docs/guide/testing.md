# Testing

Test your GraphQL resolvers and integration tests.

## Unit Testing Resolvers

```ts
import { describe, expect, it } from 'vitest'
import { userQueries } from './user.resolver'

describe('userQueries', () => {
  it('returns all users', async () => {
    const context = {
      db: mockDatabase,
    }

    const result = await userQueries.Query.users(
      {},
      {},
      context,
      {} as any
    )

    expect(result).toHaveLength(2)
  })
})
```

## Integration Testing

```ts
import { $fetch } from 'ofetch'

describe('GraphQL API', () => {
  it('queries users', async () => {
    const response = await $fetch('http://localhost:3000/api/graphql', {
      method: 'POST',
      body: {
        query: '{ users { id name } }'
      }
    })

    expect(response.data.users).toBeDefined()
  })
})
```

## Mocking Context

```ts
const mockContext = {
  db: {
    user: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  auth: {
    userId: '1',
    role: 'USER',
  },
}
```

## Next Steps

- [Resolvers](/guide/resolvers)
- [Context](/guide/context)
- [Error Handling](/guide/error-handling)
