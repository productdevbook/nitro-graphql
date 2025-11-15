---
title: Error Handling
category: Guide
---

# Error Handling

<FunctionInfo fn="errorHandling"/>

Custom errors, error formatting, and error codes in GraphQL.

## Throwing Errors

```ts
import { GraphQLError } from 'graphql'

export const userQueries = defineQuery({
  user: async (_, { id }, context) => {
    const user = await context.db.user.findUnique({ where: { id } })

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: {
          code: 'NOT_FOUND',
          id,
        },
      })
    }

    return user
  },
})
```

## Error Codes

```ts
// Authentication errors
throw new GraphQLError('Not authenticated', {
  extensions: { code: 'UNAUTHENTICATED' }
})

// Authorization errors
throw new GraphQLError('Not authorized', {
  extensions: { code: 'FORBIDDEN' }
})

// Validation errors
throw new GraphQLError('Invalid input', {
  extensions: {
    code: 'BAD_USER_INPUT',
    field: 'email',
  }
})

// Not found errors
throw new GraphQLError('Resource not found', {
  extensions: { code: 'NOT_FOUND' }
})
```

## Error Formatting

```ts
// server/graphql/config.ts
export default defineGraphQLConfig({
  maskedErrors: process.env.NODE_ENV === 'production',
  formatError: (error) => {
    console.error(error)

    return {
      message: error.message,
      extensions: error.extensions,
      path: error.path,
    }
  },
})
```

## Validation Errors

```ts
export const userMutations = defineMutation({
  createUser: async (_, { input }) => {
    const errors = validateUserInput(input)

    if (errors.length > 0) {
      throw new GraphQLError('Validation failed', {
        extensions: {
          code: 'BAD_USER_INPUT',
          validationErrors: errors,
        },
      })
    }

    return await createUser(input)
  },
})
```

## Custom Error Class

```ts
class ValidationError extends GraphQLError {
  constructor(message: string, field: string) {
    super(message, {
      extensions: {
        code: 'VALIDATION_ERROR',
        field,
      },
    })
  }
}

// Usage
throw new ValidationError('Email is invalid', 'email')
```

## Error Response

```json
{
  "errors": [
    {
      "message": "User not found",
      "extensions": {
        "code": "NOT_FOUND",
        "id": "123"
      },
      "path": ["user"]
    }
  ],
  "data": null
}
```

## Next Steps

- [Resolvers](/guide/resolvers)
- [Custom Directives](/guide/custom-directives)
- [Testing](/guide/testing)

---

## Source

<SourceLinks fn="errorHandling"/>

## Contributors

<Contributors fn="errorHandling"/>

## Changelog

<Changelog fn="errorHandling"/>
