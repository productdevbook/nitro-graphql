# Rate Limiting

Complete guide to implementing rate limiting in Nitro GraphQL to protect your API from abuse.

## Overview

This recipe covers:
- Custom @rateLimit directive
- Redis-based rate limiting
- Per-user and per-IP limits
- Token bucket algorithm
- Sliding window rate limiting
- Cost-based rate limiting
- Rate limit headers

## Custom Rate Limit Directive

### 1. Define Directive Schema

Create `server/graphql/directives/rate-limit.graphql`:

```graphql
directive @rateLimit(
  """Maximum number of requests"""
  limit: Int! = 10

  """Time window in seconds"""
  window: Int! = 60

  """Rate limit scope (IP, USER, GLOBAL)"""
  scope: RateLimitScope = IP
) on FIELD_DEFINITION

enum RateLimitScope {
  IP
  USER
  GLOBAL
}
```

### 2. Create Rate Limiter Utility

Create `server/utils/rate-limiter.ts`:

```typescript
import redis from './redis'
import { GraphQLError } from 'graphql'

export interface RateLimitConfig {
  limit: number
  window: number
  scope: 'IP' | 'USER' | 'GLOBAL'
}

// Generate rate limit key
function getRateLimitKey(
  scope: string,
  identifier: string,
  field: string
): string {
  return `ratelimit:${scope}:${identifier}:${field}`
}

// Check rate limit using fixed window
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
  field: string
): Promise<{
  allowed: boolean
  remaining: number
  resetAt: Date
}> {
  const key = getRateLimitKey(config.scope, identifier, field)
  const now = Date.now()
  const windowStart = Math.floor(now / (config.window * 1000)) * config.window

  try {
    // Increment counter
    const count = await redis.incr(key)

    // Set expiry on first request
    if (count === 1) {
      await redis.expire(key, config.window)
    }

    const remaining = Math.max(0, config.limit - count)
    const resetAt = new Date((windowStart + config.window) * 1000)

    return {
      allowed: count <= config.limit,
      remaining,
      resetAt,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    // Fail open - allow request if Redis is down
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: new Date(now + config.window * 1000),
    }
  }
}

// Sliding window rate limiter (more accurate)
export async function checkSlidingWindowRateLimit(
  identifier: string,
  config: RateLimitConfig,
  field: string
): Promise<{
  allowed: boolean
  remaining: number
  resetAt: Date
}> {
  const key = getRateLimitKey(config.scope, identifier, field)
  const now = Date.now()
  const windowStart = now - config.window * 1000

  try {
    // Add current timestamp to sorted set
    const pipeline = redis.pipeline()

    // Remove old entries
    pipeline.zremrangebyscore(key, 0, windowStart)

    // Add current request
    pipeline.zadd(key, now, `${now}`)

    // Count requests in window
    pipeline.zcard(key)

    // Set expiry
    pipeline.expire(key, config.window)

    const results = await pipeline.exec()
    const count = results?.[2]?.[1] as number

    const remaining = Math.max(0, config.limit - count)
    const resetAt = new Date(now + config.window * 1000)

    return {
      allowed: count <= config.limit,
      remaining,
      resetAt,
    }
  } catch (error) {
    console.error('Rate limit check error:', error)
    return {
      allowed: true,
      remaining: config.limit,
      resetAt: new Date(now + config.window * 1000),
    }
  }
}

// Token bucket rate limiter (allows bursts)
export class TokenBucket {
  constructor(
    private capacity: number,
    private refillRate: number // tokens per second
  ) {}

  async consume(identifier: string, tokens = 1): Promise<boolean> {
    const key = `tokenbucket:${identifier}`
    const now = Date.now()

    try {
      const data = await redis.get(key)
      let bucket: { tokens: number; lastRefill: number }

      if (data) {
        bucket = JSON.parse(data)
      } else {
        bucket = {
          tokens: this.capacity,
          lastRefill: now,
        }
      }

      // Refill tokens based on time passed
      const elapsed = (now - bucket.lastRefill) / 1000
      const refill = elapsed * this.refillRate
      bucket.tokens = Math.min(this.capacity, bucket.tokens + refill)
      bucket.lastRefill = now

      // Try to consume tokens
      if (bucket.tokens >= tokens) {
        bucket.tokens -= tokens
        await redis.setex(key, 60, JSON.stringify(bucket))
        return true
      }

      return false
    } catch (error) {
      console.error('Token bucket error:', error)
      return true // Fail open
    }
  }
}
```

### 3. Create Rate Limit Directive

Create `server/graphql/directives/rate-limit.directive.ts`:

```typescript
import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'
import { checkSlidingWindowRateLimit } from '../../utils/rate-limiter'

export const rateLimitDirective = defineDirective({
  name: 'rateLimit',
  locations: ['FIELD_DEFINITION'],
  args: {
    limit: {
      type: 'Int!',
      defaultValue: 10,
      description: 'Maximum number of requests',
    },
    window: {
      type: 'Int!',
      defaultValue: 60,
      description: 'Time window in seconds',
    },
    scope: {
      type: 'RateLimitScope',
      defaultValue: 'IP',
      description: 'Rate limit scope',
    },
  },
  description: 'Rate limit field access',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName) => {
        const rateLimitConfig = getDirective(schema, fieldConfig, 'rateLimit')?.[0]

        if (rateLimitConfig) {
          const { limit, window, scope } = rateLimitConfig
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            // Get identifier based on scope
            let identifier: string

            switch (scope) {
              case 'USER':
                if (!context.user) {
                  throw new GraphQLError('Authentication required', {
                    extensions: { code: 'UNAUTHENTICATED' },
                  })
                }
                identifier = context.user.id
                break

              case 'IP':
                identifier = context.event.node.req.headers['x-forwarded-for'] as string ||
                  context.event.node.req.socket.remoteAddress ||
                  'unknown'
                break

              case 'GLOBAL':
                identifier = 'global'
                break

              default:
                identifier = 'unknown'
            }

            // Check rate limit
            const result = await checkSlidingWindowRateLimit(
              identifier,
              { limit, window, scope },
              fieldName
            )

            // Set rate limit headers
            context.event.node.res.setHeader('X-RateLimit-Limit', limit.toString())
            context.event.node.res.setHeader('X-RateLimit-Remaining', result.remaining.toString())
            context.event.node.res.setHeader('X-RateLimit-Reset', result.resetAt.toISOString())

            if (!result.allowed) {
              throw new GraphQLError('Rate limit exceeded', {
                extensions: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  limit,
                  window,
                  resetAt: result.resetAt,
                },
              })
            }

            return resolve(source, args, context, info)
          }
        }

        return fieldConfig
      },
    })
  },
})
```

### 4. Use Rate Limit Directive

Update your schema:

```graphql
extend type Query {
  """Rate limited to 10 requests per minute"""
  users: [User!]! @rateLimit(limit: 10, window: 60)

  """Rate limited per user"""
  sensitiveData: String! @rateLimit(limit: 5, window: 60, scope: USER)

  """Global rate limit"""
  publicData: String! @rateLimit(limit: 1000, window: 60, scope: GLOBAL)
}

extend type Mutation {
  """Strict rate limit for mutations"""
  createPost(input: CreatePostInput!): Post! @rateLimit(limit: 5, window: 300)

  """Very strict for login attempts"""
  login(input: LoginInput!): AuthPayload! @rateLimit(limit: 5, window: 900, scope: IP)
}
```

## Cost-Based Rate Limiting

For more sophisticated rate limiting based on query complexity:

### 1. Define Cost Schema

```graphql
directive @cost(
  """Complexity cost of this field"""
  complexity: Int! = 1

  """Multiplier for list fields"""
  multiplier: String
) on FIELD_DEFINITION

type Query {
  users: [User!]! @cost(complexity: 1, multiplier: "limit")
  posts: [Post!]! @cost(complexity: 2, multiplier: "limit")

  # Expensive operation
  analytics: Analytics! @cost(complexity: 10)
}
```

### 2. Calculate Query Cost

Create `server/utils/query-cost.ts`:

```typescript
import { getComplexity, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity'
import type { GraphQLSchema, DocumentNode } from 'graphql'

export function calculateQueryCost(
  schema: GraphQLSchema,
  document: DocumentNode,
  variables?: Record<string, any>
): number {
  return getComplexity({
    schema,
    query: document,
    variables,
    estimators: [
      fieldExtensionsEstimator(),
      simpleEstimator({ defaultComplexity: 1 }),
    ],
  })
}

// Cost-based rate limiter
export async function checkCostRateLimit(
  identifier: string,
  cost: number,
  maxCost = 1000,
  window = 3600
): Promise<boolean> {
  const key = `cost:${identifier}`

  try {
    const current = await redis.get(key)
    const currentCost = current ? parseInt(current) : 0

    if (currentCost + cost > maxCost) {
      return false
    }

    const newCost = currentCost + cost
    await redis.setex(key, window, newCost.toString())

    return true
  } catch (error) {
    console.error('Cost rate limit error:', error)
    return true
  }
}
```

### 3. Implement Cost-Based Limiting

```typescript
export default defineGraphQLConfig({
  plugins: [
    {
      onExecute: async ({ args }) => {
        const cost = calculateQueryCost(
          args.schema,
          args.document,
          args.variableValues
        )

        const identifier = args.contextValue.user?.id ||
          args.contextValue.event.node.req.socket.remoteAddress ||
          'unknown'

        const allowed = await checkCostRateLimit(identifier, cost, 1000, 3600)

        if (!allowed) {
          throw new GraphQLError('Query cost limit exceeded', {
            extensions: {
              code: 'COST_LIMIT_EXCEEDED',
              cost,
              maxCost: 1000,
            },
          })
        }

        // Add cost header
        args.contextValue.event.node.res.setHeader('X-Query-Cost', cost.toString())
      },
    },
  ],
})
```

## Per-Endpoint Rate Limiting

For resolver-level rate limiting without directives:

```typescript
import { checkRateLimit } from '../../utils/rate-limiter'

export const protectedResolvers = defineResolver({
  Mutation: {
    sensitiveOperation: async (_parent, _args, context) => {
      const identifier = context.user?.id || context.event.node.req.socket.remoteAddress

      const result = await checkRateLimit(
        identifier!,
        { limit: 5, window: 60, scope: 'USER' },
        'sensitiveOperation'
      )

      if (!result.allowed) {
        throw new GraphQLError('Rate limit exceeded', {
          extensions: {
            code: 'RATE_LIMIT_EXCEEDED',
            resetAt: result.resetAt,
          },
        })
      }

      // Proceed with operation
      return await performSensitiveOperation()
    },
  },
})
```

## Dynamic Rate Limits

Adjust rate limits based on user tier:

```typescript
function getRateLimitForUser(user: any): RateLimitConfig {
  switch (user?.tier) {
    case 'premium':
      return { limit: 1000, window: 60, scope: 'USER' }
    case 'pro':
      return { limit: 100, window: 60, scope: 'USER' }
    case 'free':
    default:
      return { limit: 10, window: 60, scope: 'USER' }
  }
}

export const dynamicRateLimitResolver = async (_parent, _args, context) => {
  const config = getRateLimitForUser(context.user)
  const result = await checkRateLimit(
    context.user.id,
    config,
    'apiCall'
  )

  if (!result.allowed) {
    throw new GraphQLError('Rate limit exceeded for your tier', {
      extensions: {
        code: 'RATE_LIMIT_EXCEEDED',
        tier: context.user?.tier || 'free',
        limit: config.limit,
      },
    })
  }

  return await fetchData()
}
```

## Rate Limit Response Headers

Always include rate limit information in headers:

```typescript
export function setRateLimitHeaders(
  response: any,
  limit: number,
  remaining: number,
  resetAt: Date
): void {
  response.setHeader('X-RateLimit-Limit', limit.toString())
  response.setHeader('X-RateLimit-Remaining', remaining.toString())
  response.setHeader('X-RateLimit-Reset', resetAt.toISOString())
  response.setHeader('Retry-After', Math.ceil((resetAt.getTime() - Date.now()) / 1000).toString())
}
```

## Client-Side Rate Limit Handling

### 1. Detect Rate Limits

```typescript
export async function graphqlRequest(query: string, variables?: any) {
  try {
    const response = await fetch('/api/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables }),
    })

    // Check rate limit headers
    const limit = response.headers.get('X-RateLimit-Limit')
    const remaining = response.headers.get('X-RateLimit-Remaining')
    const reset = response.headers.get('X-RateLimit-Reset')

    console.log('Rate limit:', { limit, remaining, reset })

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After')
      throw new Error(`Rate limited. Retry after ${retryAfter}s`)
    }

    return await response.json()
  } catch (error) {
    console.error('GraphQL request failed:', error)
    throw error
  }
}
```

### 2. Automatic Retry with Backoff

```typescript
export async function graphqlRequestWithRetry(
  query: string,
  variables?: any,
  maxRetries = 3
) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await graphqlRequest(query, variables)
    } catch (error: any) {
      if (error.message.includes('Rate limited') && attempt < maxRetries - 1) {
        // Extract retry after time
        const match = error.message.match(/Retry after (\d+)/)
        const retryAfter = match ? parseInt(match[1]) : Math.pow(2, attempt)

        console.log(`Rate limited. Retrying after ${retryAfter}s...`)
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000))
      } else {
        throw error
      }
    }
  }
}
```

## Monitoring Rate Limits

### 1. Track Rate Limit Events

```typescript
export async function logRateLimit(
  identifier: string,
  field: string,
  allowed: boolean
): Promise<void> {
  await redis.lpush(
    'ratelimit:events',
    JSON.stringify({
      identifier,
      field,
      allowed,
      timestamp: Date.now(),
    })
  )

  // Keep only last 1000 events
  await redis.ltrim('ratelimit:events', 0, 999)
}
```

### 2. Analytics Dashboard

```typescript
export async function getRateLimitStats() {
  const events = await redis.lrange('ratelimit:events', 0, -1)
  const parsed = events.map(e => JSON.parse(e))

  const stats = {
    total: parsed.length,
    blocked: parsed.filter(e => !e.allowed).length,
    byField: {} as Record<string, number>,
    byIdentifier: {} as Record<string, number>,
  }

  for (const event of parsed) {
    stats.byField[event.field] = (stats.byField[event.field] || 0) + 1
    stats.byIdentifier[event.identifier] = (stats.byIdentifier[event.identifier] || 0) + 1
  }

  return stats
}
```

## Testing Rate Limits

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit } from '../rate-limiter'
import redis from '../redis'

describe('Rate Limiting', () => {
  beforeEach(async () => {
    await redis.flushdb()
  })

  it('should allow requests within limit', async () => {
    const result = await checkRateLimit(
      'test-user',
      { limit: 5, window: 60, scope: 'USER' },
      'testField'
    )

    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it('should block requests exceeding limit', async () => {
    // Make 5 requests
    for (let i = 0; i < 5; i++) {
      await checkRateLimit(
        'test-user',
        { limit: 5, window: 60, scope: 'USER' },
        'testField'
      )
    }

    // 6th request should be blocked
    const result = await checkRateLimit(
      'test-user',
      { limit: 5, window: 60, scope: 'USER' },
      'testField'
    )

    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })
})
```

## Best Practices

### 1. Different Limits for Different Operations

```graphql
type Query {
  # Read operations - more lenient
  users: [User!]! @rateLimit(limit: 100, window: 60)

  # Expensive operations - stricter
  analytics: Analytics! @rateLimit(limit: 10, window: 60)
}

type Mutation {
  # Write operations - strict
  createPost: Post! @rateLimit(limit: 5, window: 60)

  # Authentication - very strict
  login: AuthPayload! @rateLimit(limit: 5, window: 900, scope: IP)
}
```

### 2. Use Appropriate Scopes

- **IP**: For public endpoints and authentication
- **USER**: For authenticated operations
- **GLOBAL**: For system-wide limits

### 3. Fail Open on Redis Errors

Always allow requests if rate limiting fails to prevent downtime.

### 4. Monitor and Adjust

Regularly review rate limit metrics and adjust thresholds based on usage patterns.

## Related Recipes

- [Authentication](./authentication.md) - User identification for rate limiting
- [Error Handling](../guide/error-handling.md) - Handling rate limit errors
- [Caching Strategies](./caching-strategies.md) - Reducing load with caching

## References

- [Rate Limiting Algorithms](https://www.figma.com/blog/an-alternative-approach-to-rate-limiting/)
- [GraphQL Query Complexity](https://github.com/slicknode/graphql-query-complexity)
