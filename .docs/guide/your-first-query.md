---
title: Your First Query
category: Guide
---

# Your First Query

<FunctionInfo fn="yourFirstQuery"/>

Learn how to create, test, and use GraphQL queries and mutations in your Nitro GraphQL application.

## Understanding GraphQL Operations

GraphQL has three main operation types:

- **Query**: Read data (like GET in REST)
- **Mutation**: Modify data (like POST, PUT, DELETE in REST)
- **Subscription**: Real-time data streams (WebSocket-based)

In this guide, we'll focus on Queries and Mutations.

## Creating a Query

### Step 1: Define the Schema

First, define your query in a GraphQL schema file:

```graphql
# server/graphql/posts/post.graphql
type Post {
  id: ID!
  title: String!
  content: String!
  authorId: ID!
  publishedAt: DateTime!
}

extend type Query {
  posts: [Post!]!
  post(id: ID!): Post
}
```

::: tip Using extend type
Use `extend type Query` to add fields to the existing Query type. This allows you to split your schema across multiple files.
:::

### Step 2: Implement the Resolver

Create a resolver to fetch the data:

```ts
// server/graphql/posts/post.resolver.ts
import { defineQuery } from 'nitro-graphql/define'
import type { Post } from '#graphql/server'

// Sample data
const posts: Post[] = [
  {
    id: '1',
    title: 'Getting Started with GraphQL',
    content: 'GraphQL is amazing...',
    authorId: '1',
    publishedAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    title: 'Advanced GraphQL Patterns',
    content: 'Learn about advanced techniques...',
    authorId: '1',
    publishedAt: new Date('2024-01-15'),
  },
]

export const postQueries = defineQuery({
  // Query: posts - Returns all posts
  posts: () => {
    return posts
  },

  // Query: post(id) - Returns a single post
  post: (parent, { id }) => {
    return posts.find(p => p.id === id) || null
  },
})
```

::: info Resolver Arguments
Resolver functions receive four arguments:
1. `parent` - The parent resolver's return value
2. `args` - Arguments passed to the field
3. `context` - Shared context object (H3Event)
4. `info` - Field execution info (rarely used)
:::

### Step 3: Test in GraphQL Playground

Open [http://localhost:3000/api/graphql](http://localhost:3000/api/graphql) and test:

```graphql
query GetAllPosts {
  posts {
    id
    title
    content
    publishedAt
  }
}
```

```graphql
query GetSinglePost {
  post(id: "1") {
    id
    title
    content
  }
}
```

## Creating a Mutation

### Step 1: Define the Schema

Add mutation types to your schema:

```graphql
# server/graphql/posts/post.graphql
input CreatePostInput {
  title: String!
  content: String!
  authorId: ID!
}

input UpdatePostInput {
  title: String
  content: String
}

extend type Mutation {
  createPost(input: CreatePostInput!): Post!
  updatePost(id: ID!, input: UpdatePostInput!): Post
  deletePost(id: ID!): Boolean!
}
```

### Step 2: Implement Mutation Resolvers

```ts
// server/graphql/posts/post.resolver.ts (continued)
import { defineMutation } from 'nitro-graphql/define'
import type { Post } from '#graphql/server'

export const postMutations = defineMutation({
  createPost: async (parent, { input }, context) => {
    const newPost: Post = {
      id: Date.now().toString(),
      ...input,
      publishedAt: new Date(),
    }

    // Store using H3 storage
    const posts = await context.storage?.getItem('posts') || []
    posts.push(newPost)
    await context.storage?.setItem('posts', posts)

    return newPost
  },

  updatePost: async (parent, { id, input }, context) => {
    const posts = await context.storage?.getItem('posts') || []
    const index = posts.findIndex(p => p.id === id)

    if (index === -1) {
      return null
    }

    // Merge updates
    posts[index] = {
      ...posts[index],
      ...input,
    }

    await context.storage?.setItem('posts', posts)
    return posts[index]
  },

  deletePost: async (parent, { id }, context) => {
    const posts = await context.storage?.getItem('posts') || []
    const filtered = posts.filter(p => p.id !== id)

    await context.storage?.setItem('posts', filtered)

    // Return true if a post was deleted
    return filtered.length < posts.length
  },
})
```

### Step 3: Test Mutations

Create a post:

```graphql
mutation CreateNewPost {
  createPost(input: {
    title: "My First Post"
    content: "This is the content"
    authorId: "1"
  }) {
    id
    title
    publishedAt
  }
}
```

Update a post:

```graphql
mutation UpdateExistingPost {
  updatePost(
    id: "1"
    input: {
      title: "Updated Title"
    }
  ) {
    id
    title
    content
  }
}
```

Delete a post:

```graphql
mutation DeletePost {
  deletePost(id: "1")
}
```

## Using Context in Resolvers

The third argument to resolvers is the H3 Event context, which provides access to:

- `event` - The raw H3 event
- `storage` - Nitro storage layer
- `$fetch` - Server-side fetch
- Custom context properties you define

Example with authentication:

```ts
import { defineQuery } from 'nitro-graphql/define'

export const postQueries = defineQuery({
  myPosts: async (parent, args, context) => {
    // Access user from context
    const userId = context.auth?.userId

    if (!userId) {
      throw new Error('Unauthorized')
    }

    const posts = await context.storage?.getItem('posts') || []
    return posts.filter(p => p.authorId === userId)
  },
})
```

::: tip Learn More About Context
See the [Context Guide](/guide/context) for detailed information on extending and using context.
:::

## Query Arguments and Variables

### Optional Arguments

```graphql
type Query {
  posts(
    limit: Int = 10
    offset: Int = 0
    authorId: ID
  ): [Post!]!
}
```

```ts
import { defineQuery } from 'nitro-graphql/define'

export const postQueries = defineQuery({
  posts: (parent, { limit = 10, offset = 0, authorId }) => {
    let results = posts

    // Filter by author if provided
    if (authorId) {
      results = results.filter(p => p.authorId === authorId)
    }

    // Pagination
    return results.slice(offset, offset + limit)
  },
})
```

Test with variables:

```graphql
query GetPostsByAuthor($authorId: ID, $limit: Int) {
  posts(authorId: $authorId, limit: $limit) {
    id
    title
  }
}
```

Variables:
```json
{
  "authorId": "1",
  "limit": 5
}
```

## Async Resolvers

Most real-world resolvers are async (database calls, API requests):

```ts
import { defineQuery } from 'nitro-graphql/define'

export const postQueries = defineQuery({
  posts: async (parent, { limit = 10 }) => {
    // Simulate database query
    const db = await useDatabase()
    const posts = await db.post.findMany({
      take: limit,
      orderBy: { publishedAt: 'desc' }
    })
    return posts
  },

  post: async (parent, { id }) => {
    const db = await useDatabase()
    const post = await db.post.findUnique({
      where: { id }
    })
    return post || null
  },
})
```

## Error Handling

Throw errors to return GraphQL errors:

```ts
import { defineMutation } from 'nitro-graphql/define'
import { GraphQLError } from 'graphql'

export const postMutations = defineMutation({
  deletePost: async (parent, { id }, context) => {
    const posts = await context.storage?.getItem('posts') || []
    const post = posts.find(p => p.id === id)

    if (!post) {
      throw new GraphQLError('Post not found', {
        extensions: {
          code: 'NOT_FOUND',
          id,
        },
      })
    }

    // Check authorization
    if (post.authorId !== context.auth?.userId) {
      throw new GraphQLError('Not authorized to delete this post', {
        extensions: {
          code: 'FORBIDDEN',
        },
      })
    }

    const filtered = posts.filter(p => p.id !== id)
    await context.storage?.setItem('posts', filtered)
    return true
  },
})
```

Response:

```json
{
  "errors": [
    {
      "message": "Post not found",
      "extensions": {
        "code": "NOT_FOUND",
        "id": "999"
      }
    }
  ],
  "data": null
}
```

::: tip Error Handling Guide
See the [Error Handling Guide](/guide/error-handling) for advanced patterns.
:::

## Field Resolvers

Resolve nested fields with field resolvers:

```graphql
type Post {
  id: ID!
  title: String!
  author: User!  # ← Nested field
}

type User {
  id: ID!
  name: String!
}
```

```ts
import { defineType } from 'nitro-graphql/define'

export const postTypes = defineType({
  Post: {
    // Resolve the author field
    author: async (parent, args, context) => {
      // parent.authorId comes from the Post resolver
      const users = await context.storage?.getItem('users') || []
      return users.find(u => u.id === parent.authorId)
    },
  },
})
```

Now when you query:

```graphql
query {
  post(id: "1") {
    id
    title
    author {
      id
      name
    }
  }
}
```

The `author` field automatically resolves!

## Combining Multiple Resolvers

You can split resolvers across multiple files:

```ts
// server/graphql/posts/queries.resolver.ts
import { defineQuery } from 'nitro-graphql/define'

export const postQueries = defineQuery({
  posts: () => [...],
  post: () => {...},
})
```

```ts
// server/graphql/posts/mutations.resolver.ts
import { defineMutation } from 'nitro-graphql/define'

export const postMutations = defineMutation({
  createPost: () => {...},
  updatePost: () => {...},
  deletePost: () => {...},
})
```

```ts
// server/graphql/posts/types.resolver.ts
import { defineType } from 'nitro-graphql/define'

export const postTypes = defineType({
  Post: {
    author: () => {...},
  },
})
```

All three will be automatically discovered and merged.

## Client-Side Usage (Nuxt)

After creating queries, use them in your Nuxt app:

```graphql
# app/graphql/posts/get-posts.graphql
query GetPosts($limit: Int) {
  posts(limit: $limit) {
    id
    title
    content
    publishedAt
  }
}
```

```vue
<script setup lang="ts">
const { GetPosts } = useGraphql()

const { data: posts } = await useAsyncData('posts', () =>
  GetPosts({ limit: 10 })
)
</script>

<template>
  <div v-for="post in posts?.posts" :key="post.id">
    <h2>{{ post.title }}</h2>
    <p>{{ post.content }}</p>
  </div>
</template>
```

## Next Steps

<div class="next-steps-grid">
<div class="next-step-card">
<h3>📝 Schemas</h3>
<p>Deep dive into GraphQL schemas</p>
<a href="/guide/schemas">Learn More →</a>
</div>

<div class="next-step-card">
<h3>🔧 Resolvers</h3>
<p>Master resolver patterns</p>
<a href="/guide/resolvers">Resolvers Guide →</a>
</div>

<div class="next-step-card">
<h3>🎯 Type Generation</h3>
<p>Use TypeScript types</p>
<a href="/guide/type-generation">Type Generation →</a>
</div>

<div class="next-step-card">
<h3>🔒 Context</h3>
<p>Add authentication and custom context</p>
<a href="/guide/context">Context Guide →</a>
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

---

## Source

<SourceLinks fn="yourFirstQuery"/>

## Contributors

<Contributors fn="yourFirstQuery"/>

## Changelog

<Changelog fn="yourFirstQuery"/>
