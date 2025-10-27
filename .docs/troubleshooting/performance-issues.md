# Performance Issues

Troubleshooting and optimizing GraphQL performance in Nitro GraphQL.

## Slow Query Execution

### Problem: GraphQL queries taking too long to execute

**Symptoms:**
- Queries timing out
- High response times (>500ms for simple queries)
- Client applications feeling sluggish

**Common Causes:**
1. N+1 query problem
2. Missing database indexes
3. Fetching too much data
4. No query complexity limits
5. Inefficient resolvers

**Solutions:**

1. **Identify N+1 Queries:**

The N+1 problem occurs when fetching related data:
```typescript
// ❌ N+1 Problem - Queries database for each user
export const postResolvers = defineType('Post', {
  author: async (parent) => {
    // This runs once per post!
    return await db.user.findUnique({ where: { id: parent.authorId } })
  }
})
```

**Use DataLoader to batch requests:**
```bash
pnpm add dataloader
```

```typescript
// server/graphql/loaders/user.loader.ts
import DataLoader from 'dataloader'

export function createUserLoader() {
  return new DataLoader(async (ids: readonly string[]) => {
    const users = await db.user.findMany({
      where: { id: { in: [...ids] } }
    })

    // Return in same order as requested
    return ids.map(id => users.find(u => u.id === id))
  })
}
```

```typescript
// server/graphql/context.ts
import { createUserLoader } from './loaders/user.loader'

declare module 'h3' {
  interface H3EventContext {
    loaders: {
      user: ReturnType<typeof createUserLoader>
    }
  }
}
```

```typescript
// server/graphql/config.ts
import { createUserLoader } from './loaders/user.loader'

export default defineGraphQLConfig({
  context: () => ({
    loaders: {
      user: createUserLoader()
    }
  })
})
```

```typescript
// ✅ Optimized - Batches database queries
export const postResolvers = defineType('Post', {
  author: async (parent, _, context) => {
    return await context.loaders.user.load(parent.authorId)
  }
})
```

2. **Add Database Indexes:**
```sql
-- Add indexes for frequently queried fields
CREATE INDEX idx_posts_author_id ON posts(author_id);
CREATE INDEX idx_posts_created_at ON posts(created_at);
CREATE INDEX idx_users_email ON users(email);
```

3. **Limit Query Depth and Complexity:**
```typescript
// server/graphql/config.ts
import { createComplexityLimitRule } from 'graphql-validation-complexity'

export default defineGraphQLConfig({
  validationRules: [
    createComplexityLimitRule(1000, {
      onCost: (cost) => {
        console.log('Query cost:', cost)
      }
    })
  ]
})
```

4. **Use Field-Level Caching:**
```bash
pnpm add @envelop/response-cache
```

```typescript
// server/graphql/config.ts
import { useResponseCache } from '@envelop/response-cache'

export default defineGraphQLConfig({
  plugins: [
    useResponseCache({
      ttl: 60_000, // 1 minute
      ttlPerType: {
        User: 300_000, // 5 minutes for users
        Post: 60_000 // 1 minute for posts
      }
    })
  ]
})
```

**Prevention Tips:**
- Use DataLoader for all relation resolvers
- Add database indexes proactively
- Implement query complexity limits
- Monitor query performance regularly
- Cache stable data

---

## Memory Issues

### Problem: High memory usage or memory leaks

**Symptoms:**
- Server running out of memory
- Gradual memory increase over time
- Process crashes with "Out of memory" errors

**Common Causes:**
1. Large query results not paginated
2. DataLoader cache not clearing
3. Memory leaks in resolvers
4. Too many concurrent requests
5. Large file uploads

**Solutions:**

1. **Implement Pagination:**
```graphql
# Use cursor-based pagination
type Query {
  posts(first: Int!, after: String): PostConnection!
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

type PostEdge {
  node: Post!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}
```

```typescript
export const postQueries = defineQuery({
  posts: async (_, { first = 10, after }, context) => {
    const posts = await context.db.post.findMany({
      take: first + 1,
      skip: after ? 1 : 0,
      cursor: after ? { id: after } : undefined,
      orderBy: { createdAt: 'desc' }
    })

    const hasNextPage = posts.length > first
    const edges = posts.slice(0, first)

    return {
      edges: edges.map(post => ({
        node: post,
        cursor: post.id
      })),
      pageInfo: {
        hasNextPage,
        endCursor: edges[edges.length - 1]?.id
      }
    }
  }
})
```

2. **Clear DataLoader Cache:**
```typescript
// Create new loaders per request
export default defineGraphQLConfig({
  context: () => ({
    loaders: {
      user: createUserLoader() // New instance per request
    }
  })
})
```

3. **Set Memory Limits:**
```bash
# Start with increased memory
NODE_OPTIONS="--max-old-space-size=4096" pnpm dev

# Or in package.json
{
  "scripts": {
    "dev": "NODE_OPTIONS='--max-old-space-size=4096' nitro dev"
  }
}
```

4. **Limit Request Size:**
```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    maxRequestSize: '10mb', // Limit request body size
  }
})
```

5. **Monitor Memory Usage:**
```typescript
// Add memory monitoring
setInterval(() => {
  const usage = process.memoryUsage()
  console.log({
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`
  })
}, 30000) // Every 30 seconds
```

**Prevention Tips:**
- Always paginate large datasets
- Create fresh DataLoader instances per request
- Monitor memory usage in production
- Set appropriate memory limits
- Use streaming for large responses

---

## Type Generation Performance

### Problem: Type generation takes too long

**Symptoms:**
- Dev server slow to start
- Long wait after schema changes
- High CPU usage during type generation

**Common Causes:**
1. Too many schema files
2. Complex schema with deep nesting
3. Large number of external services
4. Inefficient file scanning

**Solutions:**

1. **Optimize Schema Organization:**
```bash
# Instead of many small files
server/graphql/user/user.graphql
server/graphql/user/profile.graphql
server/graphql/user/settings.graphql
# ... 50 more files

# Consolidate related schemas
server/graphql/user.graphql  # All user-related types
server/graphql/post.graphql  # All post-related types
```

2. **Disable Unnecessary Type Generation:**
```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    types: {
      server: true,
      client: false, // Disable if not using client queries
    }
  }
})
```

3. **Use Selective External Services:**
```typescript
// Only generate types for services you're using
externalServices: [
  {
    name: 'github',
    // Only include necessary documents
    documents: ['app/graphql/github/repos.graphql']
    // Don't use: ['app/graphql/**/*.graphql']
  }
]
```

4. **Skip Type Generation in CI:**
```bash
# For build-only environments
SKIP_TYPE_GEN=true pnpm build
```

5. **Use Incremental Type Generation:**
Type generation automatically watches for changes. Don't restart unnecessarily:
```bash
# Keep dev server running
pnpm dev

# Types regenerate automatically on file changes
```

**Prevention Tips:**
- Keep schema organized and consolidated
- Only enable features you need
- Use incremental builds
- Optimize file watching patterns

---

## Build Performance

### Problem: Slow build times

**Symptoms:**
- `pnpm build` takes too long
- Production builds timing out
- CI/CD pipeline delays

**Common Causes:**
1. Large dependency tree
2. Too many type generations
3. Unnecessary file processing
4. Large bundle size

**Solutions:**

1. **Analyze Bundle Size:**
```bash
# Use build analysis
pnpm build --analyze

# Check output size
du -sh .output
```

2. **Disable Development Features:**
```typescript
// nitro.config.ts
export default defineNitroConfig({
  graphql: {
    // Disable in production
    playground: process.env.NODE_ENV !== 'production',

    // Skip scaffold files in production
    scaffold: {
      enabled: process.env.NODE_ENV === 'development'
    }
  }
})
```

3. **Use Build Cache:**
```bash
# Enable Nitro build cache
export NITRO_CACHE_DIR=".cache/nitro"
pnpm build
```

4. **Optimize Dependencies:**
```typescript
// Instead of:
import { defineMutation, defineQuery, defineType } from 'nitro-graphql'
// Only import what you need
import { defineQuery } from 'nitro-graphql/utils/define'
```

5. **Parallel Processing:**
```bash
# Use all CPU cores for TypeScript
tsc --build --parallel
```

**Prevention Tips:**
- Keep dependencies minimal
- Use build caching
- Profile build times regularly
- Optimize for production separately

---

## Query Complexity Attacks

### Problem: Malicious or overly complex queries

**Symptoms:**
- Server becomes unresponsive
- CPU spikes on certain queries
- Database overwhelmed

**Common Causes:**
1. No query complexity limits
2. Unbounded depth
3. No rate limiting
4. Circular queries allowed

**Solutions:**

1. **Add Query Complexity Limits:**
```bash
pnpm add graphql-validation-complexity
```

```typescript
// server/graphql/config.ts
import { createComplexityLimitRule } from 'graphql-validation-complexity'

export default defineGraphQLConfig({
  validationRules: [
    createComplexityLimitRule(1000, {
      scalarCost: 1,
      objectCost: 2,
      listFactor: 10,
      onCost: (cost) => {
        if (cost > 800) {
          console.warn('High complexity query:', cost)
        }
      }
    })
  ]
})
```

2. **Limit Query Depth:**
```bash
pnpm add graphql-depth-limit
```

```typescript
import depthLimit from 'graphql-depth-limit'

export default defineGraphQLConfig({
  validationRules: [
    depthLimit(7) // Maximum 7 levels deep
  ]
})
```

3. **Add Field Cost:**
```graphql
type Query {
  # Expensive operation - high cost
  expensiveReport: Report @cost(complexity: 100)

  # Simple query - low cost
  user(id: ID!): User @cost(complexity: 1)
}
```

4. **Implement Rate Limiting:**
```bash
pnpm add @envelop/rate-limiter
```

```typescript
import { useRateLimiter } from '@envelop/rate-limiter'

export default defineGraphQLConfig({
  plugins: [
    useRateLimiter({
      max: 100, // 100 requests
      window: '60s', // per minute
      identifyFn: (context) => {
        return context.request.headers.get('x-forwarded-for') || 'anonymous'
      }
    })
  ]
})
```

5. **Timeout Queries:**
```typescript
export default defineGraphQLConfig({
  validationRules: [
    // Add query timeout
    createTimeoutRule(5000) // 5 second timeout
  ]
})
```

**Prevention Tips:**
- Always set complexity limits
- Implement depth limits
- Add rate limiting in production
- Monitor query patterns
- Log expensive queries

---

## Database Connection Issues

### Problem: Database connection pool exhausted

**Symptoms:**
- "Too many connections" errors
- Queries hanging
- Timeout errors

**Common Causes:**
1. Connection pool too small
2. Connections not released
3. Too many concurrent requests
4. Long-running queries

**Solutions:**

1. **Optimize Connection Pool:**
```typescript
// prisma/schema.prisma (for Prisma)
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")

  // Connection pool settings
  connection_limit = 10
  pool_timeout = 20
}
```

2. **Use Transactions Properly:**
```typescript
// ✅ Correct - Auto-releases connection
export const userMutations = defineMutation({
  createUser: async (_, { input }, context) => {
    return await context.db.$transaction(async (tx) => {
      const user = await tx.user.create({ data: input })
      await tx.log.create({ data: { action: 'user_created' } })
      return user
    })
  }
})

// ❌ Wrong - May leak connections
export const userMutations = defineMutation({
  createUser: async (_, { input }, context) => {
    const user = await context.db.user.create({ data: input })
    await context.db.log.create({ data: { action: 'user_created' } })
    return user
  }
})
```

3. **Monitor Active Connections:**
```typescript
// Add connection monitoring
context.db.$on('query', (e) => {
  console.log('Query:', e.query)
  console.log('Duration:', e.duration, 'ms')
})
```

4. **Implement Connection Pooling:**
```env
# .env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?connection_limit=10&pool_timeout=20"
```

**Prevention Tips:**
- Set appropriate pool sizes
- Always release connections
- Monitor connection usage
- Use connection pooling
- Implement query timeouts

---

## Caching Issues

### Problem: Cache not working or causing stale data

**Symptoms:**
- No performance improvement
- Stale data returned
- Cache hits not increasing

**Common Causes:**
1. Cache keys not unique
2. TTL too short or too long
3. Cache invalidation not working
4. Cache size too small

**Solutions:**

1. **Implement Proper Cache Keys:**
```typescript
import { useResponseCache } from '@envelop/response-cache'

export default defineGraphQLConfig({
  plugins: [
    useResponseCache({
      cache: createCustomCache(),

      // Build unique cache key
      buildResponseCacheKey: (params) => {
        const { context, operation } = params
        const userId = context.user?.id || 'anonymous'
        return `${operation}:${userId}`
      }
    })
  ]
})
```

2. **Set Appropriate TTL:**
```typescript
useResponseCache({
  ttl: 60_000, // 1 minute default

  // Per-type TTL
  ttlPerType: {
    User: 300_000, // 5 minutes
    Post: 60_000, // 1 minute
    Comment: 30_000 // 30 seconds
  },

  // Per-schema coordinate
  ttlPerSchemaCoordinate: {
    'Query.user': 600_000, // 10 minutes
    'Query.posts': 120_000 // 2 minutes
  }
})
```

3. **Implement Cache Invalidation:**
```typescript
export const userMutations = defineMutation({
  updateUser: async (_, { id, input }, context) => {
    const user = await context.db.user.update({
      where: { id },
      data: input
    })

    // Invalidate cache
    await context.cache.invalidate(`user:${id}`)

    return user
  }
})
```

4. **Monitor Cache Performance:**
```typescript
useResponseCache({
  onCacheHit: () => {
    console.log('Cache hit')
  },
  onCacheMiss: () => {
    console.log('Cache miss')
  }
})
```

**Prevention Tips:**
- Use unique cache keys
- Set appropriate TTLs
- Implement invalidation strategies
- Monitor cache hit rates
- Use Redis for distributed caching

---

## Next Steps

- [Common Issues](/troubleshooting/common-issues) - General troubleshooting
- [Type Generation Issues](/troubleshooting/type-generation-issues) - Type-specific problems
- [Debug Mode](/troubleshooting/debug-mode) - Using the debug dashboard
- [Performance Guide](/guide/performance) - Best practices
