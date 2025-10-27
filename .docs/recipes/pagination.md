# Pagination

Complete guide to implementing pagination in Nitro GraphQL with cursor-based and offset-based strategies.

## Overview

This recipe covers:
- Cursor-based pagination (Relay-style)
- Offset-based pagination (page numbers)
- Infinite scroll implementation
- Performance optimization
- Client-side integration

## Cursor-Based Pagination (Relay Specification)

Cursor-based pagination is the recommended approach for GraphQL APIs. It's more performant and handles data changes gracefully.

### 1. Define Schema

Create `server/graphql/pagination/connection.graphql`:

```graphql
"""
PageInfo contains information about pagination in a connection
"""
type PageInfo {
  """Indicates if there are more items when paginating forward"""
  hasNextPage: Boolean!

  """Indicates if there are more items when paginating backward"""
  hasPreviousPage: Boolean!

  """Cursor of the first item in the list"""
  startCursor: String

  """Cursor of the last item in the list"""
  endCursor: String
}

"""
Edge type for cursor-based pagination
"""
type PostEdge {
  """The item at the end of the edge"""
  node: Post!

  """Cursor for this item"""
  cursor: String!
}

"""
Connection type for paginated posts
"""
type PostConnection {
  """List of edges"""
  edges: [PostEdge!]!

  """Information about this page"""
  pageInfo: PageInfo!

  """Total count of items (optional, can be expensive)"""
  totalCount: Int
}

extend type Query {
  """
  Get paginated posts using cursor-based pagination
  """
  posts(
    """Number of items to return after cursor"""
    first: Int

    """Cursor to start after"""
    after: String

    """Number of items to return before cursor"""
    last: Int

    """Cursor to start before"""
    before: String

    """Filter by author ID"""
    authorId: ID

    """Filter by published status"""
    published: Boolean
  ): PostConnection!
}
```

### 2. Create Pagination Utilities

Create `server/utils/pagination.ts`:

```typescript
import { GraphQLError } from 'graphql'

export interface ConnectionArgs {
  first?: number | null
  after?: string | null
  last?: number | null
  before?: string | null
}

export interface Edge<T> {
  node: T
  cursor: string
}

export interface Connection<T> {
  edges: Edge<T>[]
  pageInfo: {
    hasNextPage: boolean
    hasPreviousPage: boolean
    startCursor: string | null
    endCursor: string | null
  }
  totalCount?: number
}

// Encode cursor (base64 encoding of ID)
export function encodeCursor(id: string): string {
  return Buffer.from(`cursor:${id}`).toString('base64')
}

// Decode cursor
export function decodeCursor(cursor: string): string {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
    if (!decoded.startsWith('cursor:')) {
      throw new Error('Invalid cursor format')
    }
    return decoded.slice(7) // Remove 'cursor:' prefix
  }
  catch (error) {
    throw new GraphQLError('Invalid cursor', {
      extensions: { code: 'BAD_REQUEST' },
    })
  }
}

// Validate pagination arguments
export function validateConnectionArgs(args: ConnectionArgs) {
  const { first, after, last, before } = args

  // Can't use both first and last
  if (first != null && last != null) {
    throw new GraphQLError('Cannot use both "first" and "last" arguments', {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  // Can't use both after and before
  if (after != null && before != null) {
    throw new GraphQLError('Cannot use both "after" and "before" arguments', {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  // Validate first
  if (first != null && first < 0) {
    throw new GraphQLError('"first" must be non-negative', {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  // Validate last
  if (last != null && last < 0) {
    throw new GraphQLError('"last" must be non-negative', {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  // Set default and max limits
  const limit = first ?? last ?? 20
  const maxLimit = 100

  if (limit > maxLimit) {
    throw new GraphQLError(`Maximum limit is ${maxLimit}`, {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  return {
    limit,
    after: after ? decodeCursor(after) : null,
    before: before ? decodeCursor(before) : null,
    isForward: first != null,
  }
}

// Create connection from items
export function createConnection<T extends { id: string }>(
  items: T[],
  args: ConnectionArgs,
  totalCount?: number
): Connection<T> {
  const { limit, isForward } = validateConnectionArgs(args)

  // Check if there are more items
  const hasMore = items.length > limit
  const nodes = hasMore ? items.slice(0, limit) : items

  // Create edges
  const edges: Edge<T>[] = nodes.map(node => ({
    node,
    cursor: encodeCursor(node.id),
  }))

  // Determine page info
  const startCursor = edges.length > 0 ? edges[0].cursor : null
  const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null

  return {
    edges,
    pageInfo: {
      hasNextPage: isForward ? hasMore : false,
      hasPreviousPage: !isForward ? hasMore : false,
      startCursor,
      endCursor,
    },
    totalCount,
  }
}
```

### 3. Implement Cursor Pagination with Prisma

Create `server/graphql/posts/connection.resolver.ts`:

```typescript
import { createConnection, decodeCursor, validateConnectionArgs } from '../../utils/pagination'

export const postConnectionResolvers = defineResolver({
  Query: {
    posts: async (_parent, args, context) => {
      const { limit, after, before, isForward } = validateConnectionArgs(args)

      // Build where clause
      const where: any = {}

      if (args.authorId) {
        where.authorId = args.authorId
      }

      if (args.published != null) {
        where.published = args.published
      }

      // Add cursor condition
      if (after) {
        where.id = { gt: after }
      }
      else if (before) {
        where.id = { lt: before }
      }

      // Fetch items (request one extra to check if there are more)
      const items = await context.db.post.findMany({
        where,
        take: limit + 1,
        orderBy: { createdAt: isForward ? 'desc' : 'asc' },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      // Reverse items if paginating backward
      if (!isForward) {
        items.reverse()
      }

      // Get total count (optional - can be expensive)
      const totalCount = await context.db.post.count({ where })

      return createConnection(items, args, totalCount)
    },
  },
})
```

### 4. Cursor Pagination with Drizzle

Create `server/graphql/posts/drizzle-connection.resolver.ts`:

```typescript
import { and, asc, desc, eq, gt, lt } from 'drizzle-orm'
import { posts, users } from '../../database/schema'
import { db } from '../../utils/drizzle'
import { createConnection, validateConnectionArgs } from '../../utils/pagination'

export const drizzlePostConnectionResolvers = defineResolver({
  Query: {
    posts: async (_parent, args) => {
      const { limit, after, before, isForward } = validateConnectionArgs(args)

      // Build conditions
      const conditions = []

      if (args.authorId) {
        conditions.push(eq(posts.authorId, args.authorId))
      }

      if (args.published != null) {
        conditions.push(eq(posts.published, args.published))
      }

      if (after) {
        conditions.push(gt(posts.id, after))
      }
      else if (before) {
        conditions.push(lt(posts.id, before))
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Fetch items
      const items = await db.query.posts.findMany({
        where: whereClause,
        limit: limit + 1,
        orderBy: isForward ? [desc(posts.createdAt)] : [asc(posts.createdAt)],
        with: {
          author: {
            columns: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      if (!isForward) {
        items.reverse()
      }

      return createConnection(items, args)
    },
  },
})
```

## Offset-Based Pagination

Offset-based pagination uses page numbers. It's simpler but less efficient for large datasets.

### 1. Define Schema

Create `server/graphql/pagination/offset.graphql`:

```graphql
"""
Pagination information for offset-based pagination
"""
type OffsetPageInfo {
  """Current page number (1-indexed)"""
  page: Int!

  """Number of items per page"""
  pageSize: Int!

  """Total number of items"""
  totalCount: Int!

  """Total number of pages"""
  totalPages: Int!

  """Whether there is a next page"""
  hasNextPage: Boolean!

  """Whether there is a previous page"""
  hasPreviousPage: Boolean!
}

"""
Result type for paginated posts
"""
type PaginatedPosts {
  """List of posts"""
  items: [Post!]!

  """Pagination information"""
  pageInfo: OffsetPageInfo!
}

extend type Query {
  """
  Get paginated posts using offset-based pagination
  """
  paginatedPosts(
    """Page number (1-indexed)"""
    page: Int = 1

    """Number of items per page"""
    pageSize: Int = 20

    """Filter by author ID"""
    authorId: ID

    """Sort order"""
    orderBy: PostOrderBy = CREATED_AT_DESC
  ): PaginatedPosts!
}

enum PostOrderBy {
  CREATED_AT_DESC
  CREATED_AT_ASC
  TITLE_ASC
  TITLE_DESC
  VIEW_COUNT_DESC
}
```

### 2. Create Offset Pagination Utility

Add to `server/utils/pagination.ts`:

```typescript
export interface OffsetPageInfo {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface OffsetPaginationResult<T> {
  items: T[]
  pageInfo: OffsetPageInfo
}

export function createOffsetPagination<T>(
  items: T[],
  totalCount: number,
  page: number,
  pageSize: number
): OffsetPaginationResult<T> {
  const totalPages = Math.ceil(totalCount / pageSize)

  return {
    items,
    pageInfo: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  }
}

export function validateOffsetPagination(page: number, pageSize: number) {
  const maxPageSize = 100

  if (page < 1) {
    throw new GraphQLError('Page must be at least 1', {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  if (pageSize < 1) {
    throw new GraphQLError('Page size must be at least 1', {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  if (pageSize > maxPageSize) {
    throw new GraphQLError(`Maximum page size is ${maxPageSize}`, {
      extensions: { code: 'BAD_REQUEST' },
    })
  }

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  }
}
```

### 3. Implement Offset Pagination

Create `server/graphql/posts/offset.resolver.ts`:

```typescript
import {
  createOffsetPagination,
  validateOffsetPagination,
} from '../../utils/pagination'

export const offsetPostResolvers = defineResolver({
  Query: {
    paginatedPosts: async (_parent, args, context) => {
      const { page = 1, pageSize = 20, authorId, orderBy = 'CREATED_AT_DESC' } = args

      // Validate pagination
      const { skip, take } = validateOffsetPagination(page, pageSize)

      // Build where clause
      const where: any = {}
      if (authorId) {
        where.authorId = authorId
      }

      // Build orderBy clause
      const orderByClause: any = {}
      switch (orderBy) {
        case 'CREATED_AT_DESC':
          orderByClause.createdAt = 'desc'
          break
        case 'CREATED_AT_ASC':
          orderByClause.createdAt = 'asc'
          break
        case 'TITLE_ASC':
          orderByClause.title = 'asc'
          break
        case 'TITLE_DESC':
          orderByClause.title = 'desc'
          break
        case 'VIEW_COUNT_DESC':
          orderByClause.viewCount = 'desc'
          break
      }

      // Fetch data
      const [items, totalCount] = await Promise.all([
        context.db.post.findMany({
          where,
          skip,
          take,
          orderBy: orderByClause,
          include: {
            author: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        }),
        context.db.post.count({ where }),
      ])

      return createOffsetPagination(items, totalCount, page, pageSize)
    },
  },
})
```

## Infinite Scroll Implementation

### 1. Client-Side Query

Create `app/graphql/default/queries.graphql`:

```graphql
query Posts($first: Int!, $after: String) {
  posts(first: $first, after: $after) {
    edges {
      node {
        id
        title
        content
        createdAt
        author {
          id
          name
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

### 2. Vue Composable for Infinite Scroll

Create `app/composables/useInfiniteScroll.ts`:

```typescript
export function useInfiniteScroll() {
  const posts = ref<any[]>([])
  const loading = ref(false)
  const hasNextPage = ref(true)
  const endCursor = ref<string | null>(null)

  const loadMore = async () => {
    if (loading.value || !hasNextPage.value) {
      return
    }

    loading.value = true

    try {
      const { data } = await useGraphQL('Posts', {
        first: 20,
        after: endCursor.value,
      })

      if (data?.posts) {
        const newPosts = data.posts.edges.map((edge: any) => edge.node)
        posts.value = [...posts.value, ...newPosts]

        hasNextPage.value = data.posts.pageInfo.hasNextPage
        endCursor.value = data.posts.pageInfo.endCursor
      }
    }
    finally {
      loading.value = false
    }
  }

  const reset = () => {
    posts.value = []
    endCursor.value = null
    hasNextPage.value = true
  }

  // Load initial data
  onMounted(() => {
    loadMore()
  })

  return {
    posts,
    loading,
    hasNextPage,
    loadMore,
    reset,
  }
}
```

### 3. Vue Component

Create `app/components/InfinitePostList.vue`:

```vue
<template>
  <div class="post-list">
    <div
      v-for="post in posts"
      :key="post.id"
      class="post-item"
    >
      <h3>{{ post.title }}</h3>
      <p>{{ post.content }}</p>
      <span>By {{ post.author.name }}</span>
    </div>

    <div
      v-if="loading"
      class="loading"
    >
      Loading...
    </div>

    <button
      v-if="hasNextPage && !loading"
      @click="loadMore"
      class="load-more"
    >
      Load More
    </button>

    <div
      v-if="!hasNextPage"
      class="end"
    >
      No more posts
    </div>
  </div>
</template>

<script setup lang="ts">
const { posts, loading, hasNextPage, loadMore } = useInfiniteScroll()
</script>
```

## Performance Optimization

### 1. Indexing

Ensure proper database indexes:

```prisma
model Post {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())

  // Add indexes for pagination
  @@index([createdAt])
  @@index([authorId, createdAt])
  @@index([published, createdAt])
}
```

### 2. Keyset Pagination (Alternative to Cursor)

For very large datasets, use keyset pagination:

```typescript
export const keysetPostResolvers = defineResolver({
  Query: {
    posts: async (_parent, { lastId, lastCreatedAt, limit = 20 }, context) => {
      const posts = await context.db.post.findMany({
        where: lastCreatedAt
          ? {
              OR: [
                { createdAt: { lt: lastCreatedAt } },
                {
                  AND: [
                    { createdAt: lastCreatedAt },
                    { id: { lt: lastId } },
                  ],
                },
              ],
            }
          : undefined,
        take: limit + 1,
        orderBy: [
          { createdAt: 'desc' },
          { id: 'desc' },
        ],
      })

      const hasNextPage = posts.length > limit
      const items = hasNextPage ? posts.slice(0, limit) : posts

      return {
        items,
        hasNextPage,
      }
    },
  },
})
```

### 3. Count Optimization

Total counts can be expensive. Consider:

```typescript
// Option 1: Approximate count for large datasets
const totalCount = await context.db.$queryRaw`
  SELECT reltuples::bigint AS estimate
  FROM pg_class
  WHERE relname = 'Post'
`

// Option 2: Cached count
const totalCount = await redis.get('posts:count') ?? await context.db.post.count()

// Option 3: Don't include count
return createConnection(items, args) // No totalCount
```

## Testing Pagination

Create `server/graphql/__tests__/pagination.test.ts`:

```typescript
import { execute, parse } from 'graphql'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../../utils/database'
import { schema } from '../schema'

describe('Pagination', () => {
  beforeEach(async () => {
    await db.post.deleteMany()
    await db.user.deleteMany()

    const user = await db.user.create({
      data: { email: 'test@example.com', name: 'Test User' },
    })

    // Create 30 posts
    await db.post.createMany({
      data: Array.from({ length: 30 }, (_, i) => ({
        title: `Post ${i + 1}`,
        content: `Content ${i + 1}`,
        authorId: user.id,
      })),
    })
  })

  it('should paginate posts with first argument', async () => {
    const query = parse(`
      query {
        posts(first: 10) {
          edges {
            node {
              title
            }
            cursor
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `)

    const result = await execute({
      schema,
      document: query,
      contextValue: { db },
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.posts.edges).toHaveLength(10)
    expect(result.data?.posts.pageInfo.hasNextPage).toBe(true)
  })

  it('should paginate with cursor', async () => {
    const firstQuery = parse(`
      query {
        posts(first: 10) {
          pageInfo {
            endCursor
          }
        }
      }
    `)

    const firstResult = await execute({
      schema,
      document: firstQuery,
      contextValue: { db },
    })

    const cursor = firstResult.data?.posts.pageInfo.endCursor

    const secondQuery = parse(`
      query {
        posts(first: 10, after: "${cursor}") {
          edges {
            node {
              title
            }
          }
        }
      }
    `)

    const secondResult = await execute({
      schema,
      document: secondQuery,
      contextValue: { db },
    })

    expect(secondResult.data?.posts.edges).toHaveLength(10)
  })
})
```

## Best Practices

### 1. Use Cursor Pagination for Feeds

Cursor pagination is best for:
- Social media feeds
- Activity streams
- Real-time data
- Large datasets

### 2. Use Offset Pagination for UI

Offset pagination is best for:
- Admin tables
- Search results with page numbers
- When users need to jump to specific pages

### 3. Set Maximum Limits

Always limit the maximum page size:

```typescript
const maxLimit = 100
if (limit > maxLimit) {
  throw new GraphQLError(`Maximum limit is ${maxLimit}`)
}
```

### 4. Index Your Cursor Fields

Ensure the fields used in cursors are indexed in your database.

## Related Recipes

- [CRUD Operations](./crud-operations.md) - Basic query operations
- [Caching Strategies](./caching-strategies.md) - Caching paginated data
- [Performance](../guide/performance.md) - Performance optimization

## References

- [Relay Cursor Connections Specification](https://relay.dev/graphql/connections.htm)
- [GraphQL Best Practices: Pagination](https://graphql.org/learn/pagination/)
