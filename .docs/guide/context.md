# Context

Learn how to work with H3EventContext in your GraphQL resolvers, add custom context properties, and access request data.

## What is Context?

Context is an object passed to every resolver function as the third argument. It contains:

- **H3 Event**: The raw H3 request event
- **Storage**: Nitro's storage layer
- **Custom Properties**: Anything you add (database, auth, etc.)

## Accessing Context

```ts
export const userQueries = defineQuery({
  users: async (parent, args, context) => {
    // context is H3EventContext
    console.log(context)
  },
})
```

## Built-in Context Properties

### event

The raw H3 event object:

```ts
export const userQueries = defineQuery({
  me: async (_, __, context) => {
    const event = context.event

    // Request headers
    const token = getHeader(event, 'authorization')

    // Request body
    const body = await readBody(event)

    // Cookies
    const sessionId = getCookie(event, 'session')

    // IP address
    const ip = getRequestIP(event)

    return findUserByToken(token)
  },
})
```

### storage

Nitro's storage layer (unstorage):

```ts
export const userQueries = defineQuery({
  users: async (_, __, context) => {
    // Get from storage
    const users = await context.storage?.getItem('users') || []

    return users
  },
})

export const userMutations = defineMutation({
  createUser: async (_, { input }, context) => {
    const users = await context.storage?.getItem('users') || []
    const user = { id: Date.now().toString(), ...input }
    users.push(user)

    // Save to storage
    await context.storage?.setItem('users', users)

    return user
  },
})
```

## Extending Context

### Define Custom Context

Create or edit `server/graphql/context.ts`:

```ts
// server/graphql/context.ts
import type { Database } from '../utils/db'

declare module 'h3' {
  interface H3EventContext {
    // Database connection
    db: Database

    // Authentication
    auth?: {
      userId: string
      role: 'admin' | 'moderator' | 'user'
    }

    // Custom services
    emailService: EmailService
    storageService: StorageService
  }
}
```

::: warning TypeScript Only
The `context.ts` file only provides TypeScript types. You must populate the context in middleware or plugins.
:::

### Populate Context

Use Nitro middleware or plugins to populate context:

```ts
// server/middleware/context.ts
export default defineEventHandler(async (event) => {
  // Add database to context
  event.context.db = await useDatabase()

  // Add auth to context
  const token = getHeader(event, 'authorization')
  if (token) {
    event.context.auth = await verifyToken(token)
  }

  // Add services
  event.context.emailService = useEmailService()
  event.context.storageService = useStorageService()
})
```

### Use Custom Context

Now access your custom context in resolvers:

```ts
import type { User } from '#graphql/server'

export const userQueries = defineQuery({
  users: async (_, __, context) => {
    // Fully typed database access
    return await context.db.user.findMany()
  },

  me: async (_, __, context) => {
    const userId = context.auth?.userId

    if (!userId) {
      throw new GraphQLError('Unauthorized', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
    }

    return await context.db.user.findUnique({
      where: { id: userId }
    })
  },
})

export const userMutations = defineMutation({
  createUser: async (_, { input }, context) => {
    const user = await context.db.user.create({
      data: input
    })

    // Use email service from context
    await context.emailService.sendWelcome(user.email)

    return user
  },
})
```

## Common Context Patterns

### Database Connection

```ts
// server/graphql/context.ts
import type { PrismaClient } from '@prisma/client'

declare module 'h3' {
  interface H3EventContext {
    db: PrismaClient
  }
}
```

```ts
// server/middleware/database.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler((event) => {
  event.context.db = prisma
})
```

```ts
// Resolver
export const postQueries = defineQuery({
  posts: async (_, __, context) => {
    return await context.db.post.findMany()
  },
})
```

### Authentication

```ts
// server/graphql/context.ts
declare module 'h3' {
  interface H3EventContext {
    auth?: {
      userId: string
      email: string
      role: string
    }
  }
}
```

```ts
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '')

  if (token) {
    try {
      const payload = await verifyJWT(token)
      event.context.auth = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
      }
    } catch (error) {
      // Invalid token - context.auth remains undefined
    }
  }
})
```

```ts
// Resolver with auth check
export const userQueries = defineQuery({
  me: (_, __, context) => {
    if (!context.auth) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
    }

    return findUser(context.auth.userId)
  },
})
```

### Request Information

```ts
// server/graphql/context.ts
declare module 'h3' {
  interface H3EventContext {
    requestInfo: {
      ip: string
      userAgent: string
      referer?: string
    }
  }
}
```

```ts
// server/middleware/request-info.ts
export default defineEventHandler((event) => {
  event.context.requestInfo = {
    ip: getRequestIP(event) || 'unknown',
    userAgent: getHeader(event, 'user-agent') || 'unknown',
    referer: getHeader(event, 'referer'),
  }
})
```

### Caching

```ts
// server/graphql/context.ts
import type { RedisClient } from 'redis'

declare module 'h3' {
  interface H3EventContext {
    cache: RedisClient
  }
}
```

```ts
// server/middleware/cache.ts
import { createClient } from 'redis'

const redis = createClient()
await redis.connect()

export default defineEventHandler((event) => {
  event.context.cache = redis
})
```

```ts
// Resolver with caching
export const postQueries = defineQuery({
  post: async (_, { id }, context) => {
    const cacheKey = `post:${id}`

    // Try cache first
    const cached = await context.cache.get(cacheKey)
    if (cached) {
      return JSON.parse(cached)
    }

    // Fetch from database
    const post = await context.db.post.findUnique({ where: { id } })

    // Cache for 5 minutes
    await context.cache.setEx(cacheKey, 300, JSON.stringify(post))

    return post
  },
})
```

## Context in GraphQL Config

You can also enhance context in the GraphQL config:

```ts
// server/graphql/config.ts
export default defineGraphQLConfig({
  context: async ({ event }) => {
    // Add extra context properties specific to GraphQL
    return {
      // event.context already has middleware-added properties
      startTime: Date.now(),
      requestId: crypto.randomUUID(),
    }
  },
})
```

Access merged context:

```ts
export const userQueries = defineQuery({
  users: async (_, __, context) => {
    console.log(context.requestId)  // From GraphQL config
    console.log(context.db)         // From middleware
    console.log(context.auth)       // From middleware
  },
})
```

## Context Best Practices

### 1. Initialize in Middleware

```ts
// ✅ Good - Initialize once in middleware
export default defineEventHandler((event) => {
  event.context.db = globalPrisma
})

// ❌ Bad - Create new instance per resolver
export const userQueries = defineQuery({
  users: async () => {
    const db = new PrismaClient()
    return await db.user.findMany()
  },
})
```

### 2. Type Everything

```ts
// ✅ Good - Fully typed
declare module 'h3' {
  interface H3EventContext {
    db: PrismaClient
    auth?: AuthPayload
  }
}

// ❌ Bad - Untyped context
declare module 'h3' {
  interface H3EventContext {
    db: any
    auth: any
  }
}
```

### 3. Optional vs Required

```ts
// ✅ Good - Optional auth
declare module 'h3' {
  interface H3EventContext {
    auth?: {  // Optional - not all routes need auth
      userId: string
    }
  }
}

// ✅ Good - Required database
declare module 'h3' {
  interface H3EventContext {
    db: Database  // Required - always available
  }
}
```

### 4. Validate in Resolvers

```ts
// ✅ Good - Check context in resolver
export const userQueries = defineQuery({
  me: (_, __, context) => {
    if (!context.auth) {
      throw new GraphQLError('Unauthorized')
    }
    return findUser(context.auth.userId)
  },
})

// ❌ Bad - Assume context exists
export const userQueries = defineQuery({
  me: (_, __, context) => {
    // This will crash if auth is undefined
    return findUser(context.auth.userId)
  },
})
```

### 5. Separate Concerns

```ts
// ✅ Good - Separate middleware files
// server/middleware/01.database.ts
// server/middleware/02.auth.ts
// server/middleware/03.services.ts

// ❌ Bad - Everything in one file
// server/middleware/context.ts (500 lines)
```

## Real-World Example

Complete authentication and database example:

```ts
// server/graphql/context.ts
import type { PrismaClient } from '@prisma/client'

declare module 'h3' {
  interface H3EventContext {
    db: PrismaClient
    auth?: {
      userId: string
      email: string
      role: 'ADMIN' | 'USER'
    }
  }
}
```

```ts
// server/middleware/01.database.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default defineEventHandler((event) => {
  event.context.db = prisma
})
```

```ts
// server/middleware/02.auth.ts
import { verify } from 'jsonwebtoken'

export default defineEventHandler(async (event) => {
  const token = getHeader(event, 'authorization')?.replace('Bearer ', '')

  if (token) {
    try {
      const payload = verify(token, process.env.JWT_SECRET!) as any
      event.context.auth = {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      }
    } catch {
      // Invalid token
    }
  }
})
```

```ts
// server/graphql/users.resolver.ts
export const userQueries = defineQuery({
  // Public query
  users: async (_, __, context) => {
    return await context.db.user.findMany()
  },

  // Protected query
  me: async (_, __, context) => {
    if (!context.auth) {
      throw new GraphQLError('Not authenticated', {
        extensions: { code: 'UNAUTHENTICATED' }
      })
    }

    return await context.db.user.findUnique({
      where: { id: context.auth.userId }
    })
  },

  // Admin-only query
  adminStats: async (_, __, context) => {
    if (!context.auth || context.auth.role !== 'ADMIN') {
      throw new GraphQLError('Not authorized', {
        extensions: { code: 'FORBIDDEN' }
      })
    }

    return await context.db.user.count()
  },
})
```

## Debugging Context

Log context to see what's available:

```ts
export const debugQuery = defineQuery({
  debug: (_, __, context) => {
    console.log('Context keys:', Object.keys(context))
    console.log('Auth:', context.auth)
    console.log('Database:', !!context.db)
    return 'Check console'
  },
})
```

## Next Steps

<div class="next-steps-grid">
<div class="next-step-card">
<h3>🔐 Custom Directives</h3>
<p>Use context in custom directives</p>
<a href="/guide/custom-directives">Directives Guide →</a>
</div>

<div class="next-step-card">
<h3>🔧 Resolvers</h3>
<p>Use context in resolvers</p>
<a href="/guide/resolvers">Resolvers Guide →</a>
</div>

<div class="next-step-card">
<h3>⚡ Performance</h3>
<p>Optimize context usage</p>
<a href="/guide/performance">Performance →</a>
</div>

<div class="next-step-card">
<h3>🧪 Testing</h3>
<p>Mock context in tests</p>
<a href="/guide/testing">Testing →</a>
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
