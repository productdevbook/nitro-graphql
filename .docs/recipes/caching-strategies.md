# Caching Strategies

Complete guide to implementing caching in Nitro GraphQL for optimal performance.

## Overview

This recipe covers:
- Response caching with Redis
- DataLoader pattern for N+1 query prevention
- In-memory caching strategies
- HTTP caching headers
- Cache invalidation patterns
- Query complexity and caching

## Redis Caching

### 1. Setup Redis

```bash
pnpm add ioredis
```

Create `server/utils/redis.ts`:

```typescript
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000)
    return delay
  },
})

redis.on('error', (error) => {
  console.error('Redis connection error:', error)
})

redis.on('connect', () => {
  console.log('✅ Connected to Redis')
})

export default redis
```

### 2. Create Cache Utility

Create `server/utils/cache.ts`:

```typescript
import { createHash } from 'node:crypto'
import redis from './redis'

// Generate cache key
export function generateCacheKey(
  operation: string,
  args?: Record<string, any>
): string {
  if (!args || Object.keys(args).length === 0) {
    return `graphql:${operation}`
  }

  const hash = createHash('md5')
    .update(JSON.stringify(args))
    .digest('hex')

  return `graphql:${operation}:${hash}`
}

// Get from cache
export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const cached = await redis.get(key)
    return cached ? JSON.parse(cached) : null
  }
  catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

// Set cache
export async function setCache(
  key: string,
  value: any,
  ttl = 3600
): Promise<void> {
  try {
    await redis.setex(key, ttl, JSON.stringify(value))
  }
  catch (error) {
    console.error('Cache set error:', error)
  }
}

// Delete from cache
export async function deleteCache(key: string): Promise<void> {
  try {
    await redis.del(key)
  }
  catch (error) {
    console.error('Cache delete error:', error)
  }
}

// Delete by pattern
export async function deleteCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  }
  catch (error) {
    console.error('Cache pattern delete error:', error)
  }
}

// Cache decorator
export function cached(ttl = 3600) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = generateCacheKey(propertyKey, args[1]) // args[1] is the GraphQL args

      // Try to get from cache
      const cached = await getCache(cacheKey)
      if (cached) {
        console.log(`Cache hit: ${cacheKey}`)
        return cached
      }

      // Execute original method
      const result = await originalMethod.apply(this, args)

      // Cache the result
      await setCache(cacheKey, result, ttl)
      console.log(`Cache miss: ${cacheKey}`)

      return result
    }

    return descriptor
  }
}
```

### 3. Use Caching in Resolvers

```typescript
import { getCache, setCache, generateCacheKey } from '../../utils/cache'

export const userResolvers = defineResolver({
  Query: {
    users: async (_parent, args, context) => {
      const cacheKey = generateCacheKey('users', args)

      // Try cache first
      const cached = await getCache(cacheKey)
      if (cached) {
        return cached
      }

      // Fetch from database
      const users = await context.db.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: args.limit || 20,
      })

      // Cache for 5 minutes
      await setCache(cacheKey, users, 300)

      return users
    },

    user: async (_parent, { id }, context) {
      const cacheKey = `user:${id}`

      const cached = await getCache(cacheKey)
      if (cached) {
        return cached
      }

      const user = await context.db.user.findUnique({
        where: { id },
      })

      if (user) {
        await setCache(cacheKey, user, 3600) // 1 hour
      }

      return user
    },
  },

  Mutation: {
    updateUser: async (_parent, { id, input }, context) => {
      const user = await context.db.user.update({
        where: { id },
        data: input,
      })

      // Invalidate cache
      await deleteCache(`user:${id}`)
      await deleteCachePattern('graphql:users:*')

      return user
    },
  },
})
```

## DataLoader Pattern

DataLoader solves the N+1 query problem by batching and caching requests.

### 1. Install DataLoader

```bash
pnpm add dataloader
```

### 2. Create DataLoaders

Create `server/utils/dataloaders.ts`:

```typescript
import type { PrismaClient } from '@prisma/client'
import DataLoader from 'dataloader'

export function createDataLoaders(db: PrismaClient) {
  // User loader
  const userLoader = new DataLoader(async (ids: readonly string[]) => {
    const users = await db.user.findMany({
      where: { id: { in: [...ids] } },
    })

    // Map users to match the order of requested IDs
    const userMap = new Map(users.map(user => [user.id, user]))
    return ids.map(id => userMap.get(id) || null)
  })

  // Post loader
  const postLoader = new DataLoader(async (ids: readonly string[]) => {
    const posts = await db.post.findMany({
      where: { id: { in: [...ids] } },
    })

    const postMap = new Map(posts.map(post => [post.id, post]))
    return ids.map(id => postMap.get(id) || null)
  })

  // Posts by author loader
  const postsByAuthorLoader = new DataLoader(async (authorIds: readonly string[]) => {
    const posts = await db.post.findMany({
      where: { authorId: { in: [...authorIds] } },
      orderBy: { createdAt: 'desc' },
    })

    // Group posts by author
    const postsByAuthor = new Map<string, any[]>()
    for (const post of posts) {
      const existing = postsByAuthor.get(post.authorId) || []
      postsByAuthor.set(post.authorId, [...existing, post])
    }

    return authorIds.map(id => postsByAuthor.get(id) || [])
  })

  return {
    userLoader,
    postLoader,
    postsByAuthorLoader,
  }
}

export type DataLoaders = ReturnType<typeof createDataLoaders>
```

### 3. Add DataLoaders to Context

Update `server/graphql/context.ts`:

```typescript
import type { DataLoaders } from '../utils/dataloaders'
import { createDataLoaders } from '../utils/dataloaders'

declare module 'h3' {
  interface H3EventContext {
    db: PrismaClient
    loaders: DataLoaders
  }
}

export async function createContext(event: any) {
  const loaders = createDataLoaders(db)

  return {
    event,
    db,
    loaders,
  }
}
```

### 4. Use DataLoaders in Resolvers

```typescript
export const postResolvers = defineResolver({
  Query: {
    posts: async (_parent, _args, context) => {
      return await context.db.post.findMany({
        orderBy: { createdAt: 'desc' },
      })
    },
  },

  Post: {
    // Instead of this (N+1 query):
    // author: async (parent, _args, context) => {
    //   return await context.db.user.findUnique({
    //     where: { id: parent.authorId },
    //   })
    // },

    // Use DataLoader (batched and cached):
    author: async (parent, _args, context) => {
      return await context.loaders.userLoader.load(parent.authorId)
    },
  },

  User: {
    posts: async (parent, _args, context) => {
      return await context.loaders.postsByAuthorLoader.load(parent.id)
    },
  },
})
```

## In-Memory Caching

For lightweight caching without Redis:

### 1. Install LRU Cache

```bash
pnpm add lru-cache
```

### 2. Create Memory Cache

Create `server/utils/memory-cache.ts`:

```typescript
import { LRUCache } from 'lru-cache'

// Create cache instance
const cache = new LRUCache<string, any>({
  max: 500, // Max items
  ttl: 1000 * 60 * 5, // 5 minutes
  updateAgeOnGet: true,
  updateAgeOnHas: true,
})

export function getMemoryCache<T>(key: string): T | undefined {
  return cache.get(key)
}

export function setMemoryCache(key: string, value: any, ttl?: number): void {
  cache.set(key, value, { ttl })
}

export function deleteMemoryCache(key: string): void {
  cache.delete(key)
}

export function clearMemoryCache(): void {
  cache.clear()
}

// Decorator for memory caching
export function memoryCached(ttl = 300000) {
  return function (
    _target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${propertyKey}:${JSON.stringify(args[1])}`

      const cached = getMemoryCache(cacheKey)
      if (cached !== undefined) {
        return cached
      }

      const result = await originalMethod.apply(this, args)
      setMemoryCache(cacheKey, result, ttl)

      return result
    }

    return descriptor
  }
}
```

## HTTP Caching Headers

### 1. Add Cache Headers to Responses

Update `server/graphql/config.ts`:

```typescript
export default defineGraphQLConfig({
  plugins: [
    {
      onExecute: ({ args }) => {
        // Add cache control header for cacheable queries
        const operationName = args.document.definitions[0]?.name?.value
        const isQuery = args.document.definitions[0]?.kind === 'OperationDefinition'
          && args.document.definitions[0]?.operation === 'query'

        if (isQuery && ['users', 'posts'].includes(operationName || '')) {
          // Cache for 5 minutes
          args.contextValue.event.node.res.setHeader(
            'Cache-Control',
            'public, max-age=300'
          )
        }
      },
    },
  ],
})
```

### 2. ETags for Cache Validation

```typescript
import { createHash } from 'node:crypto'

export async function cacheableQuery(_parent, _args, context) {
  const data = await context.db.post.findMany()

  // Generate ETag
  const etag = createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex')

  // Check if client has cached version
  const clientEtag = context.event.node.req.headers['if-none-match']

  if (clientEtag === etag) {
    context.event.node.res.statusCode = 304
    return null // Not Modified
  }

  // Set ETag header
  context.event.node.res.setHeader('ETag', etag)
  context.event.node.res.setHeader('Cache-Control', 'public, max-age=300')

  return data
}
```

## Cache Invalidation Patterns

### 1. Time-Based Invalidation

```typescript
// Cache with TTL
await setCache('users', users, 3600) // Expires after 1 hour
```

### 2. Event-Based Invalidation

```typescript
export const userMutations = defineResolver({
  Mutation: {
    createUser: async (_parent, { input }, context) => {
      const user = await context.db.user.create({
        data: input,
      })

      // Invalidate related caches
      await deleteCachePattern('graphql:users:*')
      await deleteCache('graphql:userCount')

      return user
    },

    deleteUser: async (_parent, { id }, context) => {
      await context.db.user.delete({
        where: { id },
      })

      // Invalidate specific and related caches
      await deleteCache(`user:${id}`)
      await deleteCachePattern('graphql:users:*')

      return true
    },
  },
})
```

### 3. Tag-Based Invalidation

```typescript
// Tag system for cache invalidation
const cacheTags = new Map<string, Set<string>>()

export async function setCacheWithTags(
  key: string,
  value: any,
  tags: string[],
  ttl = 3600
): Promise<void> {
  await setCache(key, value, ttl)

  // Associate tags with this cache key
  for (const tag of tags) {
    if (!cacheTags.has(tag)) {
      cacheTags.set(tag, new Set())
    }
    cacheTags.get(tag)!.add(key)
  }
}

export async function invalidateByTags(tags: string[]): Promise<void> {
  const keysToDelete = new Set<string>()

  for (const tag of tags) {
    const keys = cacheTags.get(tag)
    if (keys) {
      keys.forEach(key => keysToDelete.add(key))
      cacheTags.delete(tag)
    }
  }

  for (const key of keysToDelete) {
    await deleteCache(key)
  }
}

// Usage
await setCacheWithTags('posts', posts, ['posts', 'user:123'], 3600)
await invalidateByTags(['posts', 'user:123'])
```

## Query Complexity and Caching

### 1. Calculate Query Complexity

```typescript
import { getComplexity, simpleEstimator } from 'graphql-query-complexity'

export default defineGraphQLConfig({
  plugins: [
    {
      onExecute: ({ args }) => {
        const complexity = getComplexity({
          schema: args.schema,
          operationName: args.operationName,
          query: args.document,
          variables: args.variableValues,
          estimators: [simpleEstimator({ defaultComplexity: 1 })],
        })

        // Cache high-complexity queries longer
        if (complexity > 100) {
          setCache(`query:${operationName}`, result, 7200) // 2 hours
        }
      },
    },
  ],
})
```

### 2. Complexity-Based TTL

```typescript
function calculateTTL(complexity: number): number {
  if (complexity < 10)
    return 300 // 5 minutes
  if (complexity < 50)
    return 1800 // 30 minutes
  if (complexity < 100)
    return 3600 // 1 hour
  return 7200 // 2 hours
}
```

## Partial Caching

Cache individual fields:

```typescript
export const userResolvers = defineResolver({
  User: {
    stats: async (parent, _args, context) => {
      const cacheKey = `user:${parent.id}:stats`

      const cached = await getCache(cacheKey)
      if (cached) {
        return cached
      }

      const stats = await context.db.userStats.findUnique({
        where: { userId: parent.id },
      })

      await setCache(cacheKey, stats, 600) // 10 minutes

      return stats
    },
  },
})
```

## Monitoring Cache Performance

```typescript
const cacheMetrics = {
  hits: 0,
  misses: 0,
  writes: 0,
}

export async function getCacheWithMetrics<T>(key: string): Promise<T | null> {
  const result = await getCache<T>(key)

  if (result) {
    cacheMetrics.hits++
  }
  else {
    cacheMetrics.misses++
  }

  return result
}

export function getCacheHitRate(): number {
  const total = cacheMetrics.hits + cacheMetrics.misses
  return total > 0 ? cacheMetrics.hits / total : 0
}

// Log metrics periodically
setInterval(() => {
  console.log('Cache metrics:', {
    hits: cacheMetrics.hits,
    misses: cacheMetrics.misses,
    hitRate: `${(getCacheHitRate() * 100).toFixed(2)}%`,
  })
}, 60000) // Every minute
```

## Testing Caching

```typescript
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { deleteCache, getCache, setCache } from '../cache'

describe('Caching', () => {
  beforeEach(async () => {
    await deleteCache('test:key')
  })

  it('should cache and retrieve data', async () => {
    const data = { foo: 'bar' }
    await setCache('test:key', data, 60)

    const cached = await getCache('test:key')
    expect(cached).toEqual(data)
  })

  it('should return null for missing cache', async () => {
    const cached = await getCache('nonexistent')
    expect(cached).toBeNull()
  })

  it('should invalidate cache on update', async () => {
    await setCache('test:key', 'old', 60)

    await deleteCache('test:key')

    const cached = await getCache('test:key')
    expect(cached).toBeNull()
  })
})
```

## Best Practices

### 1. Cache Appropriate Data

Cache:
- Frequently accessed data
- Expensive computations
- External API responses
- Static or slowly changing data

Don't cache:
- User-specific sensitive data
- Real-time data
- Frequently changing data

### 2. Use Appropriate TTLs

```typescript
const TTL = {
  SHORT: 300, // 5 minutes - frequently changing
  MEDIUM: 1800, // 30 minutes - moderately changing
  LONG: 3600, // 1 hour - slowly changing
  VERY_LONG: 86400 // 24 hours - rarely changing
}
```

### 3. Implement Cache Warming

```typescript
// Warm cache on startup
async function warmCache() {
  const popularPosts = await db.post.findMany({
    where: { viewCount: { gt: 1000 } },
    take: 100,
  })

  for (const post of popularPosts) {
    await setCache(`post:${post.id}`, post, 3600)
  }
}
```

### 4. Handle Cache Failures Gracefully

```typescript
async function getCacheSafe<T>(key: string, fallback: () => Promise<T>): Promise<T> {
  try {
    const cached = await getCache<T>(key)
    if (cached)
      return cached
  }
  catch (error) {
    console.error('Cache error:', error)
  }

  return await fallback()
}
```

## Related Recipes

- [Database Integration](./database-integration.md) - Database query optimization
- [External API Integration](./external-api-integration.md) - Caching external APIs
- [Performance](../guide/performance.md) - Overall performance optimization

## References

- [DataLoader GitHub](https://github.com/graphql/dataloader)
- [Redis Commands](https://redis.io/commands)
- [HTTP Caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching)
