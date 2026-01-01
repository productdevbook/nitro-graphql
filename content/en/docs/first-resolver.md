---
title: First Resolver
description: Create your GraphQL resolvers
icon: heroicons:code-bracket
order: 2
tags:
  - resolver
  - guide
---

# First Resolver

Nitro GraphQL provides type-safe helper functions for defining resolvers. All functions must be imported from `nitro-graphql/define`.

## Quick Start

### 1. Create Schema

`server/graphql/user.graphql`:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
}

type Query {
  users: [User!]!
  user(id: ID!): User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
}

input CreateUserInput {
  name: String!
  email: String!
}
```

### 2. Create Resolver

`server/graphql/user.resolver.ts`:

```typescript
import { defineQuery, defineMutation } from 'nitro-graphql/define'

const users = [
  { id: '1', name: 'John', email: 'john@example.com' },
  { id: '2', name: 'Jane', email: 'jane@example.com' },
]

export const userQueries = defineQuery({
  users: () => users,
  user: (_, { id }) => users.find(u => u.id === id),
})

export const userMutations = defineMutation({
  createUser: (_, { input }) => {
    const user = { id: String(users.length + 1), ...input }
    users.push(user)
    return user
  },
})
```

### 3. Test It

Visit `http://localhost:3000/api/graphql`.

::callout{type="warning"}
Use **named exports** for resolvers. Default exports are not supported in v2.
::

---

## Define Functions

### defineQuery

Defines only Query resolvers:

```typescript
import { defineQuery } from 'nitro-graphql/define'

export const bookQueries = defineQuery({
  books: async (_, __, { context }) => {
    return await context.database.select().from(context.tables.book)
  },
  book: async (_, { id }, { context }) => {
    return await context.database
      .select()
      .from(context.tables.book)
      .where(eq(context.tables.book.id, id))
      .limit(1)
      .then(r => r[0])
  },
})
```

### defineMutation

Defines only Mutation resolvers:

```typescript
import { defineMutation } from 'nitro-graphql/define'

export const bookMutations = defineMutation({
  createBook: async (_, { input }, { context }) => {
    const { database, tables } = context
    const validated = tables.insertBookSchema.parse(input)
    const [book] = await database.insert(tables.book).values(validated).returning()
    return book
  },
  deleteBook: async (_, { id }, { context }) => {
    const { database, tables } = context
    await database.delete(tables.book).where(eq(tables.book.id, id))
    return true
  },
})
```

### defineResolver

Defines a complete resolver object (Query + Mutation + Type):

```typescript
import { defineResolver } from 'nitro-graphql/define'

export const postResolver = defineResolver({
  Query: {
    posts: () => posts,
    post: (_, { id }) => posts.find(p => p.id === id),
  },
  Mutation: {
    createPost: (_, { input }) => {
      const post = { id: generateId(), ...input }
      posts.push(post)
      return post
    },
  },
  Post: {
    author: (parent) => users.find(u => u.id === parent.authorId),
  },
})
```

### defineField

Defines custom type resolvers (computed fields):

```typescript
import { defineField } from 'nitro-graphql/define'

export const bookFields = defineField({
  Book: {
    // Computed field not in database
    isAvailable: (parent) => {
      const currentYear = new Date().getFullYear()
      return parent.publishedYear !== null
        && currentYear - Number.parseInt(parent.publishedYear) <= 5
    },
    // Related data
    author: async (parent, _, { context }) => {
      return await context.database
        .select()
        .from(context.tables.author)
        .where(eq(context.tables.author.id, parent.authorId))
        .limit(1)
        .then(r => r[0])
    },
  },
})
```

### defineSubscription

Defines Subscription resolvers:

```typescript
import { defineSubscription } from 'nitro-graphql/define'

export const messageSubscriptions = defineSubscription({
  messageAdded: {
    subscribe: async function* (_, { channelId }, { context }) {
      const pubsub = context.pubsub
      yield* pubsub.subscribe(`channel:${channelId}`)
    },
  },
})
```

### defineGraphQLConfig

Defines GraphQL server configuration:

```typescript
import { defineGraphQLConfig } from 'nitro-graphql/define'
import { createDefaultMaskError } from 'nitro-graphql/utils'

export default defineGraphQLConfig({
  // Error masking
  maskedErrors: {
    maskError: createDefaultMaskError(),
  },

  // Context creation
  context: async (event) => {
    const db = useDatabase()
    return {
      context: {
        database: db,
        tables,
        user: await getUserFromEvent(event),
      },
    }
  },

  // Enable GraphiQL
  graphiql: true,
})
```

### defineSchema

Schema validation with Zod/Valibot:

```typescript
import { defineSchema } from 'nitro-graphql/define'
import { z } from 'zod'

export const schemas = defineSchema({
  CreateUserInput: z.object({
    email: z.string().email('Please enter a valid email'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    age: z.number().min(18, 'You must be at least 18 years old'),
  }),
})
```

### defineDirective

Defines custom GraphQL directives:

```typescript
import { defineDirective } from 'nitro-graphql/define'
import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'

export const upperDirective = defineDirective({
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
})
```

---

## Using Context

Resolvers receive context as the third parameter:

```typescript
export const userQueries = defineQuery({
  me: async (_, __, { context }) => {
    // Access H3 event context
    const { database, tables, user } = context

    if (!user) {
      throw new Error('You must be logged in')
    }

    return await database
      .select()
      .from(tables.user)
      .where(eq(tables.user.id, user.id))
      .limit(1)
      .then(r => r[0])
  },
})
```

### Context Types

Define context types in `server/graphql/context.d.ts`:

```typescript
import type { Database } from '../utils/useDb'
import type { tables } from '../drizzle'

declare module 'nitro/h3' {
  interface H3EventContext {
    database: Database
    tables: typeof tables
    user: { id: string; email: string } | null
  }
}
```

---

## File Organization

Recommended structure:

```
server/graphql/
├── config.ts              # defineGraphQLConfig
├── context.d.ts           # Context types
├── schema.ts              # defineSchema (Zod)
├── users/
│   ├── user.graphql       # Schema
│   ├── queries.resolver.ts
│   ├── mutations.resolver.ts
│   └── field.resolver.ts
└── posts/
    ├── post.graphql
    ├── queries.resolver.ts
    └── mutations.resolver.ts
```
