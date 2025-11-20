---
title: Resolver Functions
category: API
related:
  - configuration
  - type-definitions
  - hooks
description: Complete reference for all resolver definition utilities provided by Nitro GraphQL.
---

# Resolver Functions API Reference

<FunctionInfo fn="resolverFunctions"/>

Complete reference for all resolver definition utilities provided by Nitro GraphQL.

All functions are auto-imported in resolver files and available without explicit imports.

---

## defineResolver()

Define complete resolvers with Query, Mutation, Subscription, and custom type resolvers.

### Signature

```typescript
function defineResolver(resolvers: Resolvers): Resolvers
```

### Parameters

- **resolvers**: `Resolvers` - Complete resolver object with any combination of:
  - `Query`: Query field resolvers
  - `Mutation`: Mutation field resolvers
  - `Subscription`: Subscription field resolvers
  - Custom type resolvers (e.g., `User`, `Post`)

### Return Type

Returns the same `Resolvers` object with full type safety.

### Examples

#### Basic Query and Mutation

```typescript
export const userResolvers = defineResolver({
  Query: {
    user: async (_parent, { id }, context) => {
      return await context.db.users.findById(id)
    },
    users: async (_parent, _args, context) => {
      return await context.db.users.findAll()
    }
  },
  Mutation: {
    createUser: async (_parent, { input }, context) => {
      return await context.db.users.create(input)
    }
  }
})
```

#### With Custom Type Resolvers

```typescript
export const postResolvers = defineResolver({
  Query: {
    post: async (_parent, { id }) => {
      return await fetchPost(id)
    }
  },
  Post: {
    author: async (parent, _args, context) => {
      // parent is the Post object
      return await context.db.users.findById(parent.authorId)
    },
    comments: async (parent, _args, context) => {
      return await context.db.comments.findByPostId(parent.id)
    }
  }
})
```

#### Multiple Root Types

```typescript
export const allResolvers = defineResolver({
  Query: {
    hello: () => 'Hello World'
  },
  Mutation: {
    updateStatus: async (_parent, { status }) => {
      return await updateSystemStatus(status)
    }
  },
  Subscription: {
    statusChanged: {
      subscribe: (_parent, _args, context) => {
        return context.pubsub.asyncIterator('STATUS_CHANGED')
      }
    }
  }
})
```

---

## defineQuery()

Define query-only resolvers. Convenience wrapper around `defineResolver()`.

### Signature

```typescript
function defineQuery(resolvers: Resolvers['Query']): Resolvers
```

### Parameters

- **resolvers**: `Resolvers['Query']` - Object containing query field resolvers

### Return Type

Returns a `Resolvers` object with the Query property set.

### Examples

#### Simple Queries

```typescript
export const helloQueries = defineQuery({
  hello: () => 'Hello from auto-discovered resolver!',
  greeting: (_parent, { name }) => `Hello, ${name}!`
})
```

#### With Context

```typescript
export const userQueries = defineQuery({
  user: async (_parent, { id }, context) => {
    return await context.db.users.findById(id)
  },

  users: async (_parent, { filter }, context) => {
    const { limit = 10, offset = 0 } = filter || {}
    return await context.db.users.findMany({
      limit,
      offset
    })
  },

  currentUser: async (_parent, _args, context) => {
    if (!context.auth?.userId) {
      throw new Error('Not authenticated')
    }
    return await context.db.users.findById(context.auth.userId)
  }
})
```

#### With Arguments Validation

```typescript
export const searchQueries = defineQuery({
  searchPosts: async (_parent, { query, filters }, context) => {
    if (!query || query.length < 3) {
      throw new Error('Search query must be at least 3 characters')
    }

    return await context.db.posts.search({
      query,
      tags: filters?.tags,
      authorId: filters?.authorId,
      published: filters?.published ?? true
    })
  }
})
```

---

## defineMutation()

Define mutation-only resolvers. Convenience wrapper around `defineResolver()`.

### Signature

```typescript
function defineMutation(resolvers: Resolvers['Mutation']): Resolvers
```

### Parameters

- **resolvers**: `Resolvers['Mutation']` - Object containing mutation field resolvers

### Return Type

Returns a `Resolvers` object with the Mutation property set.

### Examples

#### CRUD Operations

```typescript
export const createUserMutation = defineMutation({
  createUser: async (_parent, { input }, context) => {
    const newUser = {
      id: generateId(),
      ...input,
      createdAt: new Date()
    }

    await context.db.users.create(newUser)
    return newUser
  }
})

export const updateUserMutation = defineMutation({
  updateUser: async (_parent, { id, input }, context) => {
    const user = await context.db.users.findById(id)

    if (!user) {
      throw new Error(`User with id ${id} not found`)
    }

    const updatedUser = {
      ...user,
      ...input,
      updatedAt: new Date()
    }

    await context.db.users.update(id, updatedUser)
    return updatedUser
  },

  deleteUser: async (_parent, { id }, context) => {
    await context.db.users.delete(id)
    return true
  }
})
```

#### With Authorization

```typescript
export const adminMutations = defineMutation({
  banUser: async (_parent, { userId }, context) => {
    // Check admin permission
    if (!context.auth?.user?.isAdmin) {
      throw new Error('Unauthorized: Admin access required')
    }

    await context.db.users.update(userId, { banned: true })
    return await context.db.users.findById(userId)
  },

  deletePost: async (_parent, { postId }, context) => {
    const post = await context.db.posts.findById(postId)

    // Check ownership or admin
    if (post.authorId !== context.auth?.userId && !context.auth?.user?.isAdmin) {
      throw new Error('Unauthorized: Cannot delete this post')
    }

    await context.db.posts.delete(postId)
    return true
  }
})
```

---

## defineSubscription()

Define subscription-only resolvers. Convenience wrapper around `defineResolver()`.

### Signature

```typescript
function defineSubscription(resolvers: Resolvers['Subscription']): Resolvers
```

### Parameters

- **resolvers**: `Resolvers['Subscription']` - Object containing subscription field resolvers

### Return Type

Returns a `Resolvers` object with the Subscription property set.

### Examples

#### Basic Subscription

```typescript
export const messageSubscriptions = defineSubscription({
  messageAdded: {
    subscribe: (_parent, _args, context) => {
      return context.pubsub.asyncIterator(['MESSAGE_ADDED'])
    }
  }
})
```

#### With Filtering

```typescript
export const channelSubscriptions = defineSubscription({
  messageAdded: {
    subscribe: (_parent, { channelId }, context) => {
      return context.pubsub.asyncIterator(`CHANNEL_${channelId}`)
    },
    resolve: (payload) => {
      return payload.message
    }
  },

  userStatusChanged: {
    subscribe: (_parent, { userId }, context) => {
      return context.pubsub.asyncIterator(`USER_STATUS_${userId}`)
    }
  }
})
```

---

## defineField()

Define custom type resolvers (field resolvers for GraphQL types).

### Signature

```typescript
function defineField(resolvers: Resolvers): Resolvers
```

### Parameters

- **resolvers**: `Resolvers` - Object containing type field resolvers

### Return Type

Returns the same `Resolvers` object with full type safety.

### Examples

#### Basic Type Resolver

```typescript
export const userTypeResolvers = defineField({
  User: {
    fullName: (parent) => {
      return `${parent.firstName} ${parent.lastName}`
    },

    email: (parent, _args, context) => {
      // Only return email if viewing own profile or admin
      if (context.auth?.userId === parent.id || context.auth?.user?.isAdmin) {
        return parent.email
      }
      return null
    }
  }
})
```

#### Relationship Resolvers

```typescript
export const postTypeResolvers = defineField({
  Post: {
    author: async (parent, _args, context) => {
      return await context.db.users.findById(parent.authorId)
    },

    comments: async (parent, { limit = 10 }, context) => {
      return await context.db.comments.findByPostId(parent.id, { limit })
    },

    likes: async (parent, _args, context) => {
      return await context.db.likes.countByPostId(parent.id)
    },

    isLikedByCurrentUser: async (parent, _args, context) => {
      if (!context.auth?.userId)
        return false
      return await context.db.likes.exists(parent.id, context.auth.userId)
    }
  }
})
```

#### Computed Fields

```typescript
export const productTypeResolvers = defineField({
  Product: {
    finalPrice: (parent) => {
      if (parent.discount) {
        return parent.price * (1 - parent.discount / 100)
      }
      return parent.price
    },

    availability: async (parent, _args, context) => {
      const stock = await context.db.inventory.getStock(parent.id)
      return stock > 0 ? 'IN_STOCK' : 'OUT_OF_STOCK'
    }
  }
})
```

---

## defineDirective()

Define custom GraphQL directives.

### Signature

```typescript
function defineDirective(config: DefineDirectiveConfig): DirectiveDefinition
```

### Parameters

```typescript
interface DefineDirectiveConfig {
  name: string
  locations: ReadonlyArray<DirectiveLocationName>
  args?: Record<string, {
    type: GraphQLArgumentType
    defaultValue?: any
    description?: string
  }>
  description?: string
  isRepeatable?: boolean
  transformer?: (schema: GraphQLSchema) => GraphQLSchema
}
```

#### DirectiveLocationName

Valid directive locations:
- `'QUERY'`, `'MUTATION'`, `'SUBSCRIPTION'`
- `'FIELD'`, `'FIELD_DEFINITION'`
- `'FRAGMENT_DEFINITION'`, `'FRAGMENT_SPREAD'`, `'INLINE_FRAGMENT'`
- `'VARIABLE_DEFINITION'`
- `'SCHEMA'`, `'SCALAR'`, `'OBJECT'`, `'INTERFACE'`, `'UNION'`, `'ENUM'`, `'ENUM_VALUE'`
- `'INPUT_OBJECT'`, `'INPUT_FIELD_DEFINITION'`, `'ARGUMENT_DEFINITION'`

#### GraphQLArgumentType

Supported types:
- Scalars: `'String'`, `'Int'`, `'Float'`, `'Boolean'`, `'ID'`, `'JSON'`, `'DateTime'`
- Non-nullable: `'String!'`, `'Int!'`, etc.
- Lists: `'[String]'`, `'[String!]'`, `'[String]!'`, `'[String!]!'`
- Custom types supported via string

### Return Type

Returns a `DirectiveDefinition` object.

### Examples

#### Authentication Directive

```typescript
export const authDirective = defineDirective({
  name: 'auth',
  locations: ['FIELD_DEFINITION', 'OBJECT'],
  args: {
    requires: {
      type: 'String!',
      description: 'Required role'
    }
  },
  description: 'Protects field or type with authentication',
  transformer: (schema) => {
    // Transform schema to add auth checks
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const authDirective = getDirective(schema, fieldConfig, 'auth')?.[0]

        if (authDirective) {
          const { requires } = authDirective
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async (source, args, context, info) => {
            if (!context.auth?.user) {
              throw new Error('Not authenticated')
            }

            if (context.auth.user.role !== requires) {
              throw new Error(`Requires ${requires} role`)
            }

            return resolve(source, args, context, info)
          }
        }

        return fieldConfig
      }
    })
  }
})
```

#### Rate Limiting Directive

```typescript
export const rateLimitDirective = defineDirective({
  name: 'rateLimit',
  locations: ['FIELD_DEFINITION'],
  args: {
    limit: {
      type: 'Int!',
      defaultValue: 10,
      description: 'Number of requests allowed'
    },
    window: {
      type: 'Int!',
      defaultValue: 60,
      description: 'Time window in seconds'
    }
  },
  description: 'Rate limit field access',
  isRepeatable: false,
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, 'rateLimit')?.[0]

        if (directive) {
          const { limit, window } = directive
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async (source, args, context, info) => {
            const key = `${context.auth?.userId || context.ip}:${info.fieldName}`
            const count = await context.redis.incr(key)

            if (count === 1) {
              await context.redis.expire(key, window)
            }

            if (count > limit) {
              throw new Error('Rate limit exceeded')
            }

            return resolve(source, args, context, info)
          }
        }

        return fieldConfig
      }
    })
  }
})
```

#### Formatting Directive

```typescript
export const uppercaseDirective = defineDirective({
  name: 'uppercase',
  locations: ['FIELD_DEFINITION'],
  description: 'Converts string field to uppercase',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const directive = getDirective(schema, fieldConfig, 'uppercase')?.[0]

        if (directive) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async (source, args, context, info) => {
            const result = await resolve(source, args, context, info)

            if (typeof result === 'string') {
              return result.toUpperCase()
            }

            return result
          }
        }

        return fieldConfig
      }
    })
  }
})
```

---

## defineGraphQLConfig()

Define GraphQL server configuration (framework-specific).

### Signature

```typescript
function defineGraphQLConfig<T extends NPMConfig = NPMConfig>(
  config: Partial<DefineServerConfig<T>>
): Partial<DefineServerConfig<T>>

type DefineServerConfig<T extends NPMConfig = NPMConfig>
  = T['framework'] extends 'graphql-yoga'
    ? Partial<YogaServerOptions<H3Event, Partial<H3Event>>>
    : T['framework'] extends 'apollo-server'
      ? Partial<ApolloServerOptions<H3Event>>
      : Partial<YogaServerOptions<H3Event, Partial<H3Event>>> | Partial<ApolloServerOptions<H3Event>>
```

### Examples

#### GraphQL Yoga Configuration

```typescript
// server/graphql/config.ts
export default defineGraphQLConfig({
  // Context function
  context: req => ({
    auth: req.auth,
    db: useDatabase()
  }),

  // Masking errors in production
  maskedErrors: {
    maskError(error, message) {
      if (process.env.NODE_ENV === 'production') {
        return new Error('Internal server error')
      }
      return error
    }
  },

  // Plugins
  plugins: [
    useResponseCache(),
    useParserCache()
  ]
})
```

#### Apollo Server Configuration

```typescript
// server/graphql/config.ts
export default defineGraphQLConfig({
  // Context function
  context: async ({ event }) => ({
    auth: event.context.auth,
    db: await getDatabase()
  }),

  // Plugins
  plugins: [
    ApolloServerPluginLandingPageLocalDefault(),
    ApolloServerPluginInlineTrace()
  ],

  // Error formatting
  formatError: (error) => {
    if (process.env.NODE_ENV === 'production') {
      return new GraphQLError('Internal server error')
    }
    return error
  }
})
```

---

## defineSchema()

Define schema extensions programmatically with Standard Schema validation.

### Signature

```typescript
function defineSchema<T extends Partial<Record<keyof ResolversTypes, StandardSchemaV1>>>(
  config: T
): Flatten<T>
```

### Parameters

- **config**: Object mapping GraphQL type names to Standard Schema validators

### Return Type

Returns the flattened schema configuration object.

### Examples

#### With Valibot

```typescript
import * as v from 'valibot'

export default defineSchema({
  CreateUserInput: v.object({
    email: v.pipe(v.string(), v.email()),
    name: v.pipe(v.string(), v.minLength(2)),
    age: v.optional(v.pipe(v.number(), v.minValue(0)))
  }),

  UpdatePostInput: v.object({
    title: v.optional(v.string()),
    content: v.optional(v.string()),
    published: v.optional(v.boolean())
  })
})
```

#### With Zod

```typescript
import { z } from 'zod'

export default defineSchema({
  CreateUserInput: z.object({
    email: z.string().email(),
    name: z.string().min(2),
    age: z.number().int().positive().optional()
  }),

  LoginInput: z.object({
    email: z.string().email(),
    password: z.string().min(8)
  })
})
```

---

## Resolver Function Signatures

### Standard Resolver Signature

```typescript
type FieldResolver<TParent, TArgs, TContext, TReturn> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TReturn | Promise<TReturn>
```

### Parameters

1. **parent**: The parent object (result from parent resolver)
2. **args**: Arguments passed to the field
3. **context**: Context object (H3Event context + custom properties)
4. **info**: GraphQL execution information

### Context Type

The context parameter has the type `H3Event` from h3, augmented with your custom properties defined in `server/graphql/context.ts`:

```typescript
// server/graphql/context.ts
declare module 'nitro/h3' {
  interface H3EventContext {
    db: Database
    auth?: {
      userId: string
      user: User
    }
  }
}
```

Then in resolvers:

```typescript
export const userQueries = defineQuery({
  currentUser: async (_parent, _args, context) => {
    // context.db is typed
    // context.auth is typed
    return await context.db.users.findById(context.auth.userId)
  }
})
```

---

## Best Practices

### 1. Use Named Exports

Always use named exports for resolvers:

```typescript
// ✅ Correct
export const userQueries = defineQuery({ ... })

// ❌ Deprecated
export default defineQuery({ ... })
```

### 2. One Resolver Per File

Organize resolvers by feature:

```
server/graphql/
  users/
    queries.resolver.ts      # User queries
    mutations.resolver.ts    # User mutations
    types.resolver.ts        # User type resolvers
  posts/
    queries.resolver.ts
    mutations.resolver.ts
```

### 3. Error Handling

Always handle errors appropriately:

```typescript
export const userQueries = defineQuery({
  user: async (_parent, { id }, context) => {
    const user = await context.db.users.findById(id)

    if (!user) {
      throw new GraphQLError('User not found', {
        extensions: {
          code: 'NOT_FOUND',
          id
        }
      })
    }

    return user
  }
})
```

### 4. Type Safety

Leverage generated types from `#graphql/server`:

```typescript
import type { QueryResolvers, Resolvers } from '#graphql/server'

export const userQueries: QueryResolvers = defineQuery({
  // Fully typed!
  users: async (_parent, args, context) => {
    // args, context, and return type are all typed
    return await context.db.users.findMany(args.filter)
  }
})
```

---

## Source
<SourceLinks fn="resolverFunctions"/>

## Contributors
<Contributors fn="resolverFunctions"/>

## Changelog
<Changelog fn="resolverFunctions"/>
