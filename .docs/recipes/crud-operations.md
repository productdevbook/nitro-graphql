# CRUD Operations

Complete guide to building Create, Read, Update, Delete operations with Nitro GraphQL using different database solutions.

## Overview

This recipe covers:
- Basic CRUD implementation with in-memory data
- Prisma integration with PostgreSQL
- Drizzle ORM integration
- Type-safe resolvers with generated types
- Error handling and validation
- Testing CRUD operations

## Basic CRUD Implementation

### 1. Define Your Schema

Create `server/graphql/users/user.graphql`:

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreateUserInput {
  name: String!
  email: String!
}

input UpdateUserInput {
  name: String
  email: String
}

extend type Query {
  users: [User!]!
  user(id: ID!): User
}

extend type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}
```

### 2. Create Query Resolvers

Create `server/graphql/users/queries.resolver.ts`:

```typescript
import { db } from '../utils/database'
import { GraphQLError } from 'graphql'

export const userQueries = defineResolver({
  Query: {
    users: async () => {
      return await db.user.findMany({
        orderBy: { createdAt: 'desc' },
      })
    },

    user: async (_parent, { id }) => {
      const user = await db.user.findUnique({
        where: { id },
      })

      if (!user) {
        throw new GraphQLError(`User with id ${id} not found`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return user
    },
  },
})
```

### 3. Create Mutation Resolvers

Create `server/graphql/users/mutations.resolver.ts`:

```typescript
import { db } from '../utils/database'
import { GraphQLError } from 'graphql'
import { z } from 'zod'

// Validation schemas
const emailSchema = z.string().email()
const nameSchema = z.string().min(2).max(100)

export const userMutations = defineResolver({
  Mutation: {
    createUser: async (_parent, { input }) => {
      // Validate input
      try {
        emailSchema.parse(input.email)
        nameSchema.parse(input.name)
      } catch (error) {
        throw new GraphQLError('Invalid input data', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: error.errors,
          },
        })
      }

      // Check for duplicate email
      const existing = await db.user.findUnique({
        where: { email: input.email },
      })

      if (existing) {
        throw new GraphQLError('Email already exists', {
          extensions: { code: 'DUPLICATE_EMAIL' },
        })
      }

      // Create user
      const user = await db.user.create({
        data: {
          ...input,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })

      return user
    },

    updateUser: async (_parent, { id, input }) => {
      // Validate input if provided
      if (input.email) {
        try {
          emailSchema.parse(input.email)
        } catch (error) {
          throw new GraphQLError('Invalid email', {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }
      }

      if (input.name) {
        try {
          nameSchema.parse(input.name)
        } catch (error) {
          throw new GraphQLError('Invalid name', {
            extensions: { code: 'BAD_USER_INPUT' },
          })
        }
      }

      // Check if user exists
      const existing = await db.user.findUnique({
        where: { id },
      })

      if (!existing) {
        throw new GraphQLError(`User with id ${id} not found`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      // Check for duplicate email if changing email
      if (input.email && input.email !== existing.email) {
        const duplicate = await db.user.findUnique({
          where: { email: input.email },
        })

        if (duplicate) {
          throw new GraphQLError('Email already exists', {
            extensions: { code: 'DUPLICATE_EMAIL' },
          })
        }
      }

      // Update user
      const user = await db.user.update({
        where: { id },
        data: {
          ...input,
          updatedAt: new Date(),
        },
      })

      return user
    },

    deleteUser: async (_parent, { id }) => {
      try {
        await db.user.delete({
          where: { id },
        })
        return true
      } catch (error) {
        throw new GraphQLError(`User with id ${id} not found`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }
    },
  },
})
```

## Prisma Integration

### 1. Setup Prisma

Install dependencies:

```bash
pnpm add prisma @prisma/client
pnpm add -D @types/node
```

Initialize Prisma:

```bash
npx prisma init
```

### 2. Define Prisma Schema

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id        String   @id @default(cuid())
  name      String
  email     String   @unique
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]

  @@index([email])
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String?
  published Boolean  @default(false)
  authorId  String
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([authorId])
}
```

### 3. Create Database Client

Create `server/utils/database.ts`:

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
}

// Graceful shutdown
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await db.$disconnect()
  })
}
```

### 4. Run Migrations

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Complete CRUD with Relations

Create `server/graphql/posts/post.graphql`:

```graphql
type Post {
  id: ID!
  title: String!
  content: String
  published: Boolean!
  author: User!
  createdAt: DateTime!
  updatedAt: DateTime!
}

input CreatePostInput {
  title: String!
  content: String
  published: Boolean
  authorId: ID!
}

input UpdatePostInput {
  title: String
  content: String
  published: Boolean
}

extend type Query {
  posts(authorId: ID): [Post!]!
  post(id: ID!): Post
}

extend type Mutation {
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post!
  deletePost(id: ID!): Boolean!
  publishPost(id: ID!): Post!
}
```

Create `server/graphql/posts/resolvers.resolver.ts`:

```typescript
import { db } from '../../utils/database'
import { GraphQLError } from 'graphql'

export const postResolvers = defineResolver({
  Query: {
    posts: async (_parent, { authorId }) => {
      return await db.post.findMany({
        where: authorId ? { authorId } : undefined,
        include: { author: true },
        orderBy: { createdAt: 'desc' },
      })
    },

    post: async (_parent, { id }) => {
      const post = await db.post.findUnique({
        where: { id },
        include: { author: true },
      })

      if (!post) {
        throw new GraphQLError(`Post with id ${id} not found`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return post
    },
  },

  Mutation: {
    createPost: async (_parent, { input }) => {
      // Verify author exists
      const author = await db.user.findUnique({
        where: { id: input.authorId },
      })

      if (!author) {
        throw new GraphQLError('Author not found', {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      const post = await db.post.create({
        data: {
          title: input.title,
          content: input.content,
          published: input.published ?? false,
          authorId: input.authorId,
        },
        include: { author: true },
      })

      return post
    },

    updatePost: async (_parent, { id, input }) => {
      const post = await db.post.update({
        where: { id },
        data: input,
        include: { author: true },
      })

      return post
    },

    deletePost: async (_parent, { id }) => {
      try {
        await db.post.delete({
          where: { id },
        })
        return true
      } catch (error) {
        throw new GraphQLError(`Post with id ${id} not found`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }
    },

    publishPost: async (_parent, { id }) => {
      const post = await db.post.update({
        where: { id },
        data: { published: true },
        include: { author: true },
      })

      return post
    },
  },

  // Type resolver for nested author field
  Post: {
    author: async (parent) => {
      // If author is already loaded (from include), return it
      if ('author' in parent && parent.author) {
        return parent.author
      }

      // Otherwise, fetch it
      return await db.user.findUniqueOrThrow({
        where: { id: parent.authorId },
      })
    },
  },
})
```

## Drizzle ORM Integration

### 1. Setup Drizzle

Install dependencies:

```bash
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit
```

### 2. Configure Drizzle

Create `drizzle.config.ts`:

```typescript
import type { Config } from 'drizzle-kit'

export default {
  schema: './server/database/schema.ts',
  out: './server/database/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config
```

### 3. Define Schema

Create `server/database/schema.ts`:

```typescript
import { pgTable, text, timestamp, boolean, index } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
}))

export const posts = pgTable('posts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').notNull().default(false),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  authorIdx: index('author_idx').on(table.authorId),
}))

export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}))

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}))

// Export types
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Post = typeof posts.$inferSelect
export type NewPost = typeof posts.$inferInsert
```

### 4. Create Database Client

Create `server/utils/drizzle.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from '../database/schema'

const connectionString = process.env.DATABASE_URL!

// For queries
const queryClient = postgres(connectionString)
export const db = drizzle(queryClient, { schema })

// For migrations
export const migrationClient = postgres(connectionString, { max: 1 })
```

### 5. Run Migrations

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### 6. Create Resolvers with Drizzle

Create `server/graphql/users/drizzle.resolver.ts`:

```typescript
import { db } from '../../utils/drizzle'
import { users } from '../../database/schema'
import { eq } from 'drizzle-orm'
import { GraphQLError } from 'graphql'

export const userResolvers = defineResolver({
  Query: {
    users: async () => {
      return await db.query.users.findMany({
        orderBy: (users, { desc }) => [desc(users.createdAt)],
      })
    },

    user: async (_parent, { id }) => {
      const user = await db.query.users.findFirst({
        where: eq(users.id, id),
      })

      if (!user) {
        throw new GraphQLError(`User with id ${id} not found`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return user
    },
  },

  Mutation: {
    createUser: async (_parent, { input }) => {
      const [user] = await db.insert(users).values({
        name: input.name,
        email: input.email,
      }).returning()

      return user
    },

    updateUser: async (_parent, { id, input }) => {
      const [user] = await db.update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id))
        .returning()

      if (!user) {
        throw new GraphQLError(`User with id ${id} not found`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return user
    },

    deleteUser: async (_parent, { id }) => {
      const result = await db.delete(users)
        .where(eq(users.id, id))
        .returning()

      if (result.length === 0) {
        throw new GraphQLError(`User with id ${id} not found`, {
          extensions: { code: 'NOT_FOUND' },
        })
      }

      return true
    },
  },
})
```

## Context Integration

Access database through context for better testability:

Create `server/graphql/context.ts`:

```typescript
import type { PrismaClient } from '@prisma/client'
import { db } from '../utils/database'

declare module 'h3' {
  interface H3EventContext {
    db: PrismaClient
  }
}

export function useDatabase() {
  return db
}
```

Use in resolvers:

```typescript
export const userQueries = defineResolver({
  Query: {
    users: async (_parent, _args, context) => {
      const db = context.db
      return await db.user.findMany()
    },
  },
})
```

## Testing CRUD Operations

### 1. Setup Test Environment

Create `server/graphql/__tests__/users.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { db } from '../../utils/database'

describe('User CRUD Operations', () => {
  beforeEach(async () => {
    // Clear database before each test
    await db.post.deleteMany()
    await db.user.deleteMany()
  })

  afterAll(async () => {
    await db.$disconnect()
  })

  it('should create a user', async () => {
    const user = await db.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
      },
    })

    expect(user).toBeDefined()
    expect(user.name).toBe('Test User')
    expect(user.email).toBe('test@example.com')
  })

  it('should get all users', async () => {
    await db.user.createMany({
      data: [
        { name: 'User 1', email: 'user1@example.com' },
        { name: 'User 2', email: 'user2@example.com' },
      ],
    })

    const users = await db.user.findMany()
    expect(users).toHaveLength(2)
  })

  it('should update a user', async () => {
    const user = await db.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
      },
    })

    const updated = await db.user.update({
      where: { id: user.id },
      data: { name: 'Updated Name' },
    })

    expect(updated.name).toBe('Updated Name')
  })

  it('should delete a user', async () => {
    const user = await db.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
      },
    })

    await db.user.delete({
      where: { id: user.id },
    })

    const found = await db.user.findUnique({
      where: { id: user.id },
    })

    expect(found).toBeNull()
  })

  it('should cascade delete posts when user is deleted', async () => {
    const user = await db.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        posts: {
          create: [
            { title: 'Post 1', content: 'Content 1' },
            { title: 'Post 2', content: 'Content 2' },
          ],
        },
      },
    })

    await db.user.delete({
      where: { id: user.id },
    })

    const posts = await db.post.findMany({
      where: { authorId: user.id },
    })

    expect(posts).toHaveLength(0)
  })
})
```

### 2. Integration Tests with GraphQL

Create `server/graphql/__tests__/integration.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { execute, parse } from 'graphql'
import { schema } from '../schema'

describe('User GraphQL Integration', () => {
  it('should create and fetch a user', async () => {
    const createMutation = parse(`
      mutation {
        createUser(input: { name: "Test User", email: "test@example.com" }) {
          id
          name
          email
        }
      }
    `)

    const createResult = await execute({
      schema,
      document: createMutation,
    })

    expect(createResult.errors).toBeUndefined()
    expect(createResult.data?.createUser.name).toBe('Test User')

    const userId = createResult.data?.createUser.id

    const query = parse(`
      query {
        user(id: "${userId}") {
          id
          name
          email
        }
      }
    `)

    const queryResult = await execute({
      schema,
      document: query,
    })

    expect(queryResult.errors).toBeUndefined()
    expect(queryResult.data?.user.name).toBe('Test User')
  })
})
```

## Best Practices

### 1. Input Validation

Always validate input data:

```typescript
import { z } from 'zod'

const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
})

export const userMutations = defineResolver({
  Mutation: {
    createUser: async (_parent, { input }) => {
      const validated = createUserSchema.parse(input)
      return await db.user.create({ data: validated })
    },
  },
})
```

### 2. Error Handling

Use meaningful error codes and messages:

```typescript
throw new GraphQLError('User not found', {
  extensions: {
    code: 'NOT_FOUND',
    userId: id,
  },
})
```

### 3. Transaction Support

Use transactions for multiple operations:

```typescript
export const userMutations = defineResolver({
  Mutation: {
    createUserWithPost: async (_parent, { userInput, postInput }) => {
      return await db.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: userInput,
        })

        const post = await tx.post.create({
          data: {
            ...postInput,
            authorId: user.id,
          },
        })

        return { user, post }
      })
    },
  },
})
```

### 4. Soft Deletes

Implement soft deletes for better data retention:

```typescript
// Add to schema
model User {
  // ... other fields
  deletedAt DateTime?
}

// Resolver
export const userMutations = defineResolver({
  Mutation: {
    deleteUser: async (_parent, { id }) => {
      await db.user.update({
        where: { id },
        data: { deletedAt: new Date() },
      })
      return true
    },
  },
})
```

## Related Recipes

- [Database Integration](./database-integration.md) - Detailed database setup guides
- [Authentication](./authentication.md) - Protecting CRUD operations
- [Pagination](./pagination.md) - Handling large datasets
- [Caching Strategies](./caching-strategies.md) - Improving performance

## Playground Example

See the complete implementation in the Nuxt playground:
- Schema: `playgrounds/nuxt/server/graphql/users/user.graphql`
- Resolvers: `playgrounds/nuxt/server/graphql/users/*.resolver.ts`
- Data layer: `playgrounds/nuxt/server/graphql/data/index.ts`
