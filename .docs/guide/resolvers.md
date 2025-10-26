# Resolvers

Master GraphQL resolvers with `defineResolver`, `defineQuery`, `defineMutation`, `defineType`, and `defineSubscription`.

## What are Resolvers?

Resolvers are functions that return data for GraphQL fields. They connect your schema to your data sources (databases, APIs, files, etc.).

## Resolver Functions

All resolver utility functions are auto-imported in `.resolver.ts` files. They are exported from `nitro-graphql/utils/define`.

### defineResolver

Define a complete resolver map with Query, Mutation, and custom types:

```ts
// server/graphql/app.resolver.ts
export const appResolver = defineResolver({
  Query: {
    hello: () => 'Hello World',
    user: (_, { id }) => findUser(id),
  },
  Mutation: {
    createUser: (_, { input }) => createUser(input),
  },
  User: {
    posts: parent => findPostsByUser(parent.id),
  },
})
```

### defineQuery

Define only Query resolvers:

```ts
// server/graphql/users/queries.resolver.ts
export const userQueries = defineQuery({
  users: async (_, __, context) => {
    return await context.storage?.getItem('users') || []
  },
  user: async (_, { id }, context) => {
    const users = await context.storage?.getItem('users') || []
    return users.find(u => u.id === id) || null
  },
})
```

### defineMutation

Define only Mutation resolvers:

```ts
// server/graphql/users/mutations.resolver.ts
export const userMutations = defineMutation({
  createUser: async (_, { input }, context) => {
    const users = await context.storage?.getItem('users') || []
    const user = {
      id: Date.now().toString(),
      ...input,
      createdAt: new Date(),
    }
    users.push(user)
    await context.storage?.setItem('users', users)
    return user
  },

  updateUser: async (_, { id, input }, context) => {
    const users = await context.storage?.getItem('users') || []
    const index = users.findIndex(u => u.id === id)
    if (index === -1)
      return null

    users[index] = { ...users[index], ...input }
    await context.storage?.setItem('users', users)
    return users[index]
  },

  deleteUser: async (_, { id }, context) => {
    const users = await context.storage?.getItem('users') || []
    const filtered = users.filter(u => u.id !== id)
    await context.storage?.setItem('users', filtered)
    return filtered.length < users.length
  },
})
```

### defineType

Define field resolvers for custom types:

```ts
// server/graphql/users/types.resolver.ts
export const userTypes = defineType({
  User: {
    // Resolve the posts field
    posts: async (parent, _, context) => {
      const posts = await context.storage?.getItem('posts') || []
      return posts.filter(p => p.authorId === parent.id)
    },

    // Resolve the fullName field
    fullName: (parent) => {
      return `${parent.firstName} ${parent.lastName}`
    },

    // Async field resolver
    avatar: async (parent) => {
      return await fetchAvatar(parent.email)
    },
  },
})
```

### defineSubscription

Define WebSocket subscriptions:

```ts
// server/graphql/messages/subscriptions.resolver.ts
export const messageSubscriptions = defineSubscription({
  messageAdded: {
    subscribe: (_, __, context) => {
      return context.pubsub.asyncIterator(['MESSAGE_ADDED'])
    },
    resolve: payload => payload,
  },

  userTyping: {
    subscribe: (_, { channelId }, context) => {
      return context.pubsub.asyncIterator([`TYPING_${channelId}`])
    },
  },
})
```

::: tip Learn More
See the [Subscriptions Guide](/guide/subscriptions) for detailed WebSocket setup.
:::

## Resolver Arguments

All resolver functions receive four arguments:

```ts
function resolver(parent, args, context, info) {
  // ...
}
```

### 1. parent

The return value from the parent field resolver:

```ts
// Schema
type User {
  id: ID!
  posts: [Post!]!
}

// Resolvers
export const userQueries = defineQuery({
  user: () => ({
    id: '1',
    name: 'John',
    // ... user data
  }),
})

export const userTypes = defineType({
  User: {
    posts: (parent) => {
      // parent is the User object from the query resolver
      console.log(parent.id)  // '1'
      console.log(parent.name) // 'John'
      return findPostsByUser(parent.id)
    },
  },
})
```

### 2. args

Arguments passed to the field:

```ts
export const userQueries = defineQuery({
  user: (_, args) => {
    console.log(args.id) // The id argument
    return findUser(args.id)
  },

  users: (_, args) => {
    console.log(args.limit) // 10
    console.log(args.offset) // 0
    return findUsers(args)
  },
})
```

With destructuring:

```ts
export const userQueries = defineQuery({
  user: (_, { id }) => findUser(id),
  users: (_, { limit = 10, offset = 0 }) => findUsers(limit, offset),
})
```

### 3. context

The H3 Event context object:

```ts
export const userQueries = defineQuery({
  me: async (_, __, context) => {
    // Access H3 event
    const event = context.event

    // Access storage
    const users = await context.storage?.getItem('users')

    // Access custom context
    const userId = context.auth?.userId

    // Use server-side fetch
    const data = await context.$fetch('/api/data')

    return findUser(userId)
  },
})
```

::: tip Learn More About Context
See the [Context Guide](/guide/context) for details on extending and using context.
:::

### 4. info

Field execution information (rarely used):

```ts
export const userQueries = defineQuery({
  users: (_, __, ___, info) => {
    console.log(info.fieldName) // 'users'
    console.log(info.returnType) // [User!]!
    console.log(info.parentType) // Query
    console.log(info.path) // Path to this field

    // Useful for optimization - check what fields were requested
    const requestedFields = info.fieldNodes[0].selectionSet?.selections
    return findUsers()
  },
})
```

## Async Resolvers

Most resolvers are async for database/API calls:

```ts
export const postQueries = defineQuery({
  posts: async () => {
    const db = await useDatabase()
    return await db.post.findMany()
  },

  post: async (_, { id }) => {
    const db = await useDatabase()
    return await db.post.findUnique({ where: { id } })
  },
})

export const postMutations = defineMutation({
  createPost: async (_, { input }) => {
    const db = await useDatabase()
    return await db.post.create({ data: input })
  },
})
```

## Field Resolvers

Resolve nested fields with field resolvers:

```graphql
type Post {
  id: ID!
  title: String!
  author: User!      # ← Needs resolver
  comments: [Comment!]!  # ← Needs resolver
  likeCount: Int!    # ← Computed field
}
```

```ts
export const postTypes = defineType({
  Post: {
    // Resolve author relationship
    author: async (parent, _, context) => {
      const users = await context.storage?.getItem('users') || []
      return users.find(u => u.id === parent.authorId)
    },

    // Resolve comments relationship
    comments: async (parent, _, context) => {
      const comments = await context.storage?.getItem('comments') || []
      return comments.filter(c => c.postId === parent.id)
    },

    // Computed field
    likeCount: (parent) => {
      return parent.likes?.length || 0
    },
  },
})
```

## DataLoader Pattern

Prevent N+1 queries with DataLoader:

```ts
import DataLoader from 'dataloader'

// Create a DataLoader
const userLoader = new DataLoader(async (userIds: readonly string[]) => {
  const users = await db.user.findMany({
    where: { id: { in: [...userIds] } }
  })
  // Return in the same order as requested
  return userIds.map(id => users.find(u => u.id === id))
})

export const postTypes = defineType({
  Post: {
    // Use DataLoader - batches and caches requests
    author: async (parent) => {
      return await userLoader.load(parent.authorId)
    },
  },
})
```

::: tip Performance
See the [Performance Guide](/guide/performance) for advanced optimization techniques.
:::

## Error Handling

Throw GraphQL errors from resolvers:

```ts
import { GraphQLError } from 'graphql'

export const postMutations = defineMutation({
  deletePost: async (_, { id }, context) => {
    const post = await findPost(id)

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: {
          code: 'NOT_FOUND',
          id,
        },
      })
    }

    if (post.authorId !== context.auth?.userId) {
      throw new GraphQLError('Not authorized', {
        extensions: {
          code: 'FORBIDDEN',
        },
      })
    }

    await deletePost(id)
    return true
  },
})
```

::: tip Error Handling Guide
See the [Error Handling Guide](/guide/error-handling) for patterns and best practices.
:::

## Type Safety

Use generated types for full type safety:

```ts
import type { CreateUserInput, Resolvers, User } from '#graphql/server'

export const userMutations = defineMutation({
  createUser: async (
    _,
    { input }: { input: CreateUserInput },
    context
  ): Promise<User> => {
    const user: User = {
      id: Date.now().toString(),
      name: input.name,
      email: input.email,
      createdAt: new Date(),
    }
    return user
  },
})
```

::: tip
The resolver functions themselves are already typed! The return type of `defineMutation` is `Resolvers`, which includes all type information from your schema.
:::

## Combining Multiple Resolvers

Split resolvers across files - they're automatically merged:

```ts
// server/graphql/users/queries.resolver.ts
export const userQueries = defineQuery({
  users: () => [...],
  user: () => ({...}),
})
```

```ts
// server/graphql/users/mutations.resolver.ts
export const userMutations = defineMutation({
  createUser: () => ({...}),
  updateUser: () => ({...}),
})
```

```ts
// server/graphql/users/types.resolver.ts
export const userTypes = defineType({
  User: {
    posts: () => [...],
  },
})
```

```ts
// server/graphql/posts/queries.resolver.ts
export const postQueries = defineQuery({
  posts: () => [...],
  post: () => ({...}),
})
```

All four resolvers are discovered and merged automatically!

## Best Practices

### 1. Use Named Exports

```ts
// ✅ Correct
export const userQueries = defineQuery({...})
export const userMutations = defineMutation({...})

// ❌ Wrong - won't be discovered
export default defineQuery({...})
```

### 2. Keep Resolvers Focused

```ts
// ✅ Good - Single responsibility
export const userQueries = defineQuery({
  users: () => getAllUsers(),
  user: (_, { id }) => getUser(id),
})

export const userMutations = defineMutation({
  createUser: (_, { input }) => createUser(input),
})

// ❌ Bad - Too much in one file
export const everythingResolver = defineResolver({
  Query: { /* 50 queries */ },
  Mutation: { /* 50 mutations */ },
  User: { /* many fields */ },
  Post: { /* many fields */ },
  // ...
})
```

### 3. Extract Business Logic

```ts
// ✅ Good - Logic separated
async function createUserAccount(input: CreateUserInput) {
  // Validation
  if (!isValidEmail(input.email)) {
    throw new Error('Invalid email')
  }

  // Business logic
  const user = await db.user.create({ data: input })
  await sendWelcomeEmail(user.email)
  return user
}

export const userMutations = defineMutation({
  createUser: (_, { input }) => createUserAccount(input),
})

// ❌ Bad - Everything in resolver
export const userMutations = defineMutation({
  createUser: async (_, { input }) => {
    if (!isValidEmail(input.email))
      throw new Error('Invalid email')
    const user = await db.user.create({ data: input })
    await sendWelcomeEmail(user.email)
    return user
  },
})
```

### 4. Use Context for Shared Resources

```ts
// ✅ Good - Use context
export const userQueries = defineQuery({
  users: async (_, __, context) => {
    const db = context.db // Shared DB connection
    return await db.user.findMany()
  },
})

// ❌ Bad - Create new connection each time
export const userQueries = defineQuery({
  users: async () => {
    const db = await createDbConnection()
    return await db.user.findMany()
  },
})
```

### 5. Handle Null Cases

```ts
// ✅ Good - Explicit null handling
export const userQueries = defineQuery({
  user: async (_, { id }, context) => {
    const user = await context.db.user.findUnique({ where: { id } })
    return user || null // Explicit null for not found
  },
})

// ❌ Bad - Undefined can cause issues
export const userQueries = defineQuery({
  user: async (_, { id }, context) => {
    return await context.db.user.findUnique({ where: { id } })
    // Returns undefined if not found
  },
})
```

## Real-World Example

Here's a complete example with database, auth, and error handling:

```ts
import type { CreatePostInput, Post, UpdatePostInput } from '#graphql/server'
// server/graphql/posts/post.resolver.ts
import { GraphQLError } from 'graphql'

export const postQueries = defineQuery({
  posts: async (_, { limit = 10, offset = 0 }, context) => {
    return await context.db.post.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    })
  },

  post: async (_, { id }, context) => {
    const post = await context.db.post.findUnique({
      where: { id },
    })

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      })
    }

    return post
  },

  myPosts: async (_, __, context) => {
    const userId = context.auth?.userId

    if (!userId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHENTICATED' },
      })
    }

    return await context.db.post.findMany({
      where: { authorId: userId },
    })
  },
})

export const postMutations = defineMutation({
  createPost: async (_, { input }, context) => {
    const userId = context.auth?.userId

    if (!userId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHENTICATED' },
      })
    }

    const post = await context.db.post.create({
      data: {
        ...input,
        authorId: userId,
      },
    })

    return post
  },

  updatePost: async (_, { id, input }, context) => {
    const post = await context.db.post.findUnique({ where: { id } })

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: { code: 'NOT_FOUND' },
      })
    }

    if (post.authorId !== context.auth?.userId) {
      throw new GraphQLError('Not authorized', {
        extensions: { code: 'FORBIDDEN' },
      })
    }

    return await context.db.post.update({
      where: { id },
      data: input,
    })
  },
})

export const postTypes = defineType({
  Post: {
    author: async (parent, _, context) => {
      return await context.db.user.findUnique({
        where: { id: parent.authorId },
      })
    },

    comments: async (parent, _, context) => {
      return await context.db.comment.findMany({
        where: { postId: parent.id },
      })
    },

    isLiked: async (parent, _, context) => {
      const userId = context.auth?.userId
      if (!userId)
        return false

      const like = await context.db.like.findFirst({
        where: {
          postId: parent.id,
          userId,
        },
      })

      return !!like
    },
  },
})
```

## Next Steps

<div class="next-steps-grid">
<div class="next-step-card">
<h3>🔧 Context</h3>
<p>Work with H3 Event context</p>
<a href="/guide/context">Context Guide →</a>
</div>

<div class="next-step-card">
<h3>📝 Type Generation</h3>
<p>Use generated TypeScript types</p>
<a href="/guide/type-generation">Type Generation →</a>
</div>

<div class="next-step-card">
<h3>🚀 Performance</h3>
<p>Optimize resolver performance</p>
<a href="/guide/performance">Performance →</a>
</div>

<div class="next-step-card">
<h3>🎭 Custom Directives</h3>
<p>Add directives to resolvers</p>
<a href="/guide/custom-directives">Directives →</a>
</div>
</div>

<style scoped>
.next-steps-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin: 24px 0;
}

.next-step-card {
  padding: 20px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background-color: var(--vp-c-bg-soft);
  transition: all 0.3s;
}

.next-step-card:hover {
  border-color: var(--vp-c-brand-1);
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(225, 0, 152, 0.1);
}

.next-step-card h3 {
  margin-top: 0;
  margin-bottom: 8px;
  font-size: 16px;
}

.next-step-card p {
  margin-bottom: 12px;
  color: var(--vp-c-text-2);
  font-size: 14px;
}

.next-step-card a {
  color: var(--vp-c-brand-1);
  text-decoration: none;
  font-weight: 600;
  font-size: 14px;
}

@media (max-width: 768px) {
  .next-steps-grid {
    grid-template-columns: 1fr;
  }
}
</style>
