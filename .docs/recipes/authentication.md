# Authentication

Complete guide to implementing authentication in Nitro GraphQL using JWT, sessions, and OAuth.

## Overview

This recipe covers:
- JWT-based authentication
- Session-based authentication with Redis
- OAuth integration (GitHub, Google)
- Protected resolvers and queries
- Refresh token strategy
- Authentication context setup
- Password hashing with bcrypt

## JWT Authentication

### 1. Setup Dependencies

```bash
pnpm add jsonwebtoken bcrypt
pnpm add -D @types/jsonwebtoken @types/bcrypt
```

### 2. Define User Schema

Create `server/graphql/auth/auth.graphql`:

```graphql
type User {
  id: ID!
  email: String!
  name: String!
  role: Role!
  createdAt: DateTime!
}

enum Role {
  USER
  ADMIN
}

type AuthPayload {
  user: User!
  accessToken: String!
  refreshToken: String!
}

input SignupInput {
  email: String!
  password: String!
  name: String!
}

input LoginInput {
  email: String!
  password: String!
}

extend type Query {
  me: User
}

extend type Mutation {
  signup(input: SignupInput!): AuthPayload!
  login(input: LoginInput!): AuthPayload!
  refreshToken(refreshToken: String!): AuthPayload!
  logout: Boolean!
}
```

### 3. Create Authentication Utilities

Create `server/utils/auth.ts`:

```typescript
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { H3Event } from 'h3'

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret'
const ACCESS_TOKEN_EXPIRES = '15m'
const REFRESH_TOKEN_EXPIRES = '7d'
const SALT_ROUNDS = 10

export interface JWTPayload {
  userId: string
  email: string
  role: string
}

// Generate access token
export function generateAccessToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  })
}

// Generate refresh token
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES,
  })
}

// Verify access token
export function verifyAccessToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired token')
  }
}

// Verify refresh token
export function verifyRefreshToken(token: string): JWTPayload {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as JWTPayload
  } catch (error) {
    throw new Error('Invalid or expired refresh token')
  }
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS)
}

// Compare password
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return await bcrypt.compare(password, hash)
}

// Extract token from Authorization header
export function extractToken(event: H3Event): string | null {
  const authorization = getHeader(event, 'authorization')

  if (!authorization || !authorization.startsWith('Bearer ')) {
    return null
  }

  return authorization.slice(7)
}

// Get current user from token
export async function getCurrentUser(event: H3Event, db: any) {
  const token = extractToken(event)

  if (!token) {
    return null
  }

  try {
    const payload = verifyAccessToken(token)

    const user = await db.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return user
  } catch (error) {
    return null
  }
}
```

### 4. Configure GraphQL Context

Update `server/graphql/context.ts`:

```typescript
import type { PrismaClient, User } from '@prisma/client'
import { db } from '../utils/database'
import { getCurrentUser } from '../utils/auth'

declare module 'h3' {
  interface H3EventContext {
    db: PrismaClient
    user: User | null
  }
}

// This function is called for every GraphQL request
export async function createContext(event: any) {
  const user = await getCurrentUser(event, db)

  return {
    event,
    db,
    user,
  }
}
```

### 5. Create Authentication Resolvers

Create `server/graphql/auth/auth.resolver.ts`:

```typescript
import { GraphQLError } from 'graphql'
import { z } from 'zod'
import {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../../utils/auth'

// Validation schemas
const emailSchema = z.string().email()
const passwordSchema = z.string().min(8).max(100)
const nameSchema = z.string().min(2).max(100)

export const authResolvers = defineResolver({
  Query: {
    me: async (_parent, _args, context) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      return context.user
    },
  },

  Mutation: {
    signup: async (_parent, { input }, context) => {
      const { email, password, name } = input

      // Validate input
      try {
        emailSchema.parse(email)
        passwordSchema.parse(password)
        nameSchema.parse(name)
      } catch (error) {
        throw new GraphQLError('Invalid input data', {
          extensions: {
            code: 'BAD_USER_INPUT',
            validationErrors: error.errors,
          },
        })
      }

      // Check if user already exists
      const existingUser = await context.db.user.findUnique({
        where: { email },
      })

      if (existingUser) {
        throw new GraphQLError('Email already registered', {
          extensions: { code: 'EMAIL_EXISTS' },
        })
      }

      // Hash password
      const hashedPassword = await hashPassword(password)

      // Create user
      const user = await context.db.user.create({
        data: {
          email,
          name,
          password: hashedPassword,
          role: 'USER',
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      })

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      }

      const accessToken = generateAccessToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)

      // Store refresh token in database
      await context.db.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      })

      return {
        user,
        accessToken,
        refreshToken,
      }
    },

    login: async (_parent, { input }, context) => {
      const { email, password } = input

      // Validate input
      try {
        emailSchema.parse(email)
        passwordSchema.parse(password)
      } catch (error) {
        throw new GraphQLError('Invalid input data', {
          extensions: { code: 'BAD_USER_INPUT' },
        })
      }

      // Find user
      const user = await context.db.user.findUnique({
        where: { email },
      })

      if (!user) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        })
      }

      // Verify password
      const isValid = await comparePassword(password, user.password)

      if (!isValid) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        })
      }

      // Generate tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      }

      const accessToken = generateAccessToken(tokenPayload)
      const refreshToken = generateRefreshToken(tokenPayload)

      // Store refresh token
      await context.db.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      })

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
        accessToken,
        refreshToken,
      }
    },

    refreshToken: async (_parent, { refreshToken }, context) => {
      // Verify refresh token
      let payload
      try {
        payload = verifyRefreshToken(refreshToken)
      } catch (error) {
        throw new GraphQLError('Invalid refresh token', {
          extensions: { code: 'INVALID_TOKEN' },
        })
      }

      // Check if token exists in database
      const storedToken = await context.db.refreshToken.findFirst({
        where: {
          token: refreshToken,
          userId: payload.userId,
          expiresAt: { gt: new Date() },
        },
      })

      if (!storedToken) {
        throw new GraphQLError('Refresh token not found or expired', {
          extensions: { code: 'INVALID_TOKEN' },
        })
      }

      // Get user
      const user = await context.db.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      })

      if (!user) {
        throw new GraphQLError('User not found', {
          extensions: { code: 'USER_NOT_FOUND' },
        })
      }

      // Generate new tokens
      const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
      }

      const newAccessToken = generateAccessToken(tokenPayload)
      const newRefreshToken = generateRefreshToken(tokenPayload)

      // Invalidate old refresh token and store new one
      await context.db.$transaction([
        context.db.refreshToken.delete({
          where: { id: storedToken.id },
        }),
        context.db.refreshToken.create({
          data: {
            token: newRefreshToken,
            userId: user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        }),
      ])

      return {
        user,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      }
    },

    logout: async (_parent, _args, context) => {
      if (!context.user) {
        throw new GraphQLError('Not authenticated', {
          extensions: { code: 'UNAUTHENTICATED' },
        })
      }

      // Delete all refresh tokens for the user
      await context.db.refreshToken.deleteMany({
        where: { userId: context.user.id },
      })

      return true
    },
  },
})
```

### 6. Update Prisma Schema

Add to `prisma/schema.prisma`:

```prisma
model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String
  password      String
  role          Role           @default(USER)
  refreshTokens RefreshToken[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([email])
}

enum Role {
  USER
  ADMIN
}

model RefreshToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([userId])
  @@index([token])
}
```

Run migrations:

```bash
npx prisma migrate dev --name add_authentication
```

## Session-Based Authentication with Redis

### 1. Setup Redis

```bash
pnpm add ioredis connect-redis express-session
pnpm add -D @types/express-session
```

### 2. Configure Redis Client

Create `server/utils/redis.ts`:

```typescript
import Redis from 'ioredis'

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,
})

redis.on('error', (error) => {
  console.error('Redis connection error:', error)
})

redis.on('connect', () => {
  console.log('Connected to Redis')
})

export default redis
```

### 3. Session Management Utilities

Create `server/utils/session.ts`:

```typescript
import redis from './redis'
import { H3Event } from 'h3'
import crypto from 'crypto'

const SESSION_PREFIX = 'session:'
const SESSION_EXPIRY = 60 * 60 * 24 * 7 // 7 days

export interface SessionData {
  userId: string
  email: string
  role: string
  createdAt: number
}

// Generate session ID
function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Create session
export async function createSession(data: SessionData): Promise<string> {
  const sessionId = generateSessionId()
  const key = `${SESSION_PREFIX}${sessionId}`

  await redis.setex(
    key,
    SESSION_EXPIRY,
    JSON.stringify(data)
  )

  return sessionId
}

// Get session
export async function getSession(sessionId: string): Promise<SessionData | null> {
  const key = `${SESSION_PREFIX}${sessionId}`
  const data = await redis.get(key)

  if (!data) {
    return null
  }

  // Extend session expiry on each access
  await redis.expire(key, SESSION_EXPIRY)

  return JSON.parse(data)
}

// Delete session
export async function deleteSession(sessionId: string): Promise<void> {
  const key = `${SESSION_PREFIX}${sessionId}`
  await redis.del(key)
}

// Extract session ID from cookie
export function extractSessionId(event: H3Event): string | null {
  const cookies = parseCookies(event)
  return cookies.sessionId || null
}

// Set session cookie
export function setSessionCookie(event: H3Event, sessionId: string): void {
  setCookie(event, 'sessionId', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_EXPIRY,
    path: '/',
  })
}

// Clear session cookie
export function clearSessionCookie(event: H3Event): void {
  deleteCookie(event, 'sessionId')
}
```

### 4. Session-Based Resolvers

Create `server/graphql/auth/session.resolver.ts`:

```typescript
import { GraphQLError } from 'graphql'
import {
  createSession,
  deleteSession,
  setSessionCookie,
  clearSessionCookie,
} from '../../utils/session'
import { hashPassword, comparePassword } from '../../utils/auth'

export const sessionAuthResolvers = defineResolver({
  Mutation: {
    login: async (_parent, { input }, context) => {
      const { email, password } = input

      // Find user
      const user = await context.db.user.findUnique({
        where: { email },
      })

      if (!user || !(await comparePassword(password, user.password))) {
        throw new GraphQLError('Invalid credentials', {
          extensions: { code: 'INVALID_CREDENTIALS' },
        })
      }

      // Create session
      const sessionId = await createSession({
        userId: user.id,
        email: user.email,
        role: user.role,
        createdAt: Date.now(),
      })

      // Set session cookie
      setSessionCookie(context.event, sessionId)

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          createdAt: user.createdAt,
        },
      }
    },

    logout: async (_parent, _args, context) => {
      if (!context.user) {
        return true
      }

      const sessionId = extractSessionId(context.event)
      if (sessionId) {
        await deleteSession(sessionId)
      }

      clearSessionCookie(context.event)
      return true
    },
  },
})
```

## OAuth Integration (GitHub Example)

### 1. Setup OAuth

```bash
pnpm add @auth/core @auth/nuxt
```

### 2. Configure GitHub OAuth

Create `server/utils/oauth.ts`:

```typescript
import { H3Event } from 'h3'

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID!
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET!
const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/callback/github'

export interface GitHubUser {
  id: number
  login: string
  email: string
  name: string
  avatar_url: string
}

// Get GitHub OAuth URL
export function getGitHubAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope: 'user:email',
    state,
  })

  return `https://github.com/login/oauth/authorize?${params.toString()}`
}

// Exchange code for access token
export async function exchangeGitHubCode(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: GITHUB_CALLBACK_URL,
    }),
  })

  const data = await response.json()

  if (data.error) {
    throw new Error(data.error_description || 'Failed to exchange code')
  }

  return data.access_token
}

// Get GitHub user data
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch GitHub user')
  }

  return await response.json()
}
```

### 3. OAuth Resolvers

Create `server/graphql/auth/oauth.resolver.ts`:

```typescript
import { GraphQLError } from 'graphql'
import {
  getGitHubAuthUrl,
  exchangeGitHubCode,
  getGitHubUser,
} from '../../utils/oauth'
import { generateAccessToken, generateRefreshToken } from '../../utils/auth'
import crypto from 'crypto'

export const oauthResolvers = defineResolver({
  Query: {
    githubAuthUrl: () => {
      const state = crypto.randomBytes(16).toString('hex')
      // Store state in Redis for verification
      return getGitHubAuthUrl(state)
    },
  },

  Mutation: {
    githubAuth: async (_parent, { code }, context) => {
      try {
        // Exchange code for access token
        const accessToken = await exchangeGitHubCode(code)

        // Get GitHub user data
        const githubUser = await getGitHubUser(accessToken)

        // Find or create user in database
        let user = await context.db.user.findUnique({
          where: { email: githubUser.email },
        })

        if (!user) {
          user = await context.db.user.create({
            data: {
              email: githubUser.email,
              name: githubUser.name || githubUser.login,
              githubId: String(githubUser.id),
              avatar: githubUser.avatar_url,
              role: 'USER',
            },
          })
        }

        // Generate JWT tokens
        const tokenPayload = {
          userId: user.id,
          email: user.email,
          role: user.role,
        }

        const jwtAccessToken = generateAccessToken(tokenPayload)
        const refreshToken = generateRefreshToken(tokenPayload)

        return {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            createdAt: user.createdAt,
          },
          accessToken: jwtAccessToken,
          refreshToken,
        }
      } catch (error) {
        throw new GraphQLError('GitHub authentication failed', {
          extensions: {
            code: 'OAUTH_ERROR',
            details: error.message,
          },
        })
      }
    },
  },
})
```

## Client-Side Usage

### 1. Login Mutation

Create `app/graphql/default/mutations.graphql`:

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    user {
      id
      email
      name
      role
    }
    accessToken
    refreshToken
  }
}

mutation Signup($input: SignupInput!) {
  signup(input: $input) {
    user {
      id
      email
      name
      role
    }
    accessToken
    refreshToken
  }
}

mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    user {
      id
      email
      name
    }
    accessToken
    refreshToken
  }
}

mutation Logout {
  logout
}
```

### 2. Composable for Authentication

Create `app/composables/useAuth.ts`:

```typescript
export function useAuth() {
  const accessToken = useState<string | null>('accessToken', () => null)
  const refreshToken = useState<string | null>('refreshToken', () => null)
  const user = useState<any>('user', () => null)

  const login = async (email: string, password: string) => {
    const { data, error } = await useGraphQL('Login', {
      input: { email, password },
    })

    if (error) {
      throw error
    }

    if (data?.login) {
      accessToken.value = data.login.accessToken
      refreshToken.value = data.login.refreshToken
      user.value = data.login.user

      // Store tokens in localStorage
      if (process.client) {
        localStorage.setItem('accessToken', data.login.accessToken)
        localStorage.setItem('refreshToken', data.login.refreshToken)
      }
    }

    return data?.login
  }

  const logout = async () => {
    await useGraphQL('Logout')

    accessToken.value = null
    refreshToken.value = null
    user.value = null

    if (process.client) {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
    }
  }

  const refresh = async () => {
    if (!refreshToken.value) {
      return false
    }

    try {
      const { data, error } = await useGraphQL('RefreshToken', {
        refreshToken: refreshToken.value,
      })

      if (error || !data?.refreshToken) {
        await logout()
        return false
      }

      accessToken.value = data.refreshToken.accessToken
      refreshToken.value = data.refreshToken.refreshToken
      user.value = data.refreshToken.user

      if (process.client) {
        localStorage.setItem('accessToken', data.refreshToken.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken.refreshToken)
      }

      return true
    } catch (error) {
      await logout()
      return false
    }
  }

  // Initialize from localStorage
  if (process.client) {
    const storedAccessToken = localStorage.getItem('accessToken')
    const storedRefreshToken = localStorage.getItem('refreshToken')

    if (storedAccessToken && storedRefreshToken) {
      accessToken.value = storedAccessToken
      refreshToken.value = storedRefreshToken
    }
  }

  return {
    login,
    logout,
    refresh,
    accessToken,
    user,
    isAuthenticated: computed(() => !!accessToken.value),
  }
}
```

### 3. HTTP Plugin for Auth Headers

Create `app/plugins/auth.ts`:

```typescript
export default defineNuxtPlugin(() => {
  const { accessToken, refresh } = useAuth()

  // Add Authorization header to all GraphQL requests
  const graphqlFetch = $fetch.create({
    onRequest({ options }) {
      if (accessToken.value) {
        options.headers = {
          ...options.headers,
          Authorization: `Bearer ${accessToken.value}`,
        }
      }
    },

    async onResponseError({ response }) {
      // If 401, try to refresh token
      if (response.status === 401) {
        const refreshed = await refresh()

        if (refreshed) {
          // Retry the request
          return
        }
      }
    },
  })

  return {
    provide: {
      graphqlFetch,
    },
  }
})
```

## Testing Authentication

Create `server/graphql/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { execute, parse } from 'graphql'
import { schema } from '../schema'
import { db } from '../../utils/database'
import { hashPassword } from '../../utils/auth'

describe('Authentication', () => {
  beforeEach(async () => {
    await db.user.deleteMany()
  })

  it('should sign up a new user', async () => {
    const mutation = parse(`
      mutation {
        signup(input: {
          email: "test@example.com"
          password: "password123"
          name: "Test User"
        }) {
          user {
            email
            name
          }
          accessToken
          refreshToken
        }
      }
    `)

    const result = await execute({
      schema,
      document: mutation,
      contextValue: { db, user: null },
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.signup.user.email).toBe('test@example.com')
    expect(result.data?.signup.accessToken).toBeDefined()
  })

  it('should login with valid credentials', async () => {
    // Create user
    await db.user.create({
      data: {
        email: 'test@example.com',
        name: 'Test User',
        password: await hashPassword('password123'),
        role: 'USER',
      },
    })

    const mutation = parse(`
      mutation {
        login(input: {
          email: "test@example.com"
          password: "password123"
        }) {
          user {
            email
          }
          accessToken
        }
      }
    `)

    const result = await execute({
      schema,
      document: mutation,
      contextValue: { db, user: null },
    })

    expect(result.errors).toBeUndefined()
    expect(result.data?.login.accessToken).toBeDefined()
  })

  it('should reject invalid credentials', async () => {
    const mutation = parse(`
      mutation {
        login(input: {
          email: "wrong@example.com"
          password: "wrongpassword"
        }) {
          user {
            email
          }
        }
      }
    `)

    const result = await execute({
      schema,
      document: mutation,
      contextValue: { db, user: null },
    })

    expect(result.errors).toBeDefined()
    expect(result.errors?.[0].extensions?.code).toBe('INVALID_CREDENTIALS')
  })
})
```

## Best Practices

### 1. Secure Password Storage

Always hash passwords with bcrypt:
```typescript
const hashedPassword = await hashPassword(password)
```

### 2. Token Expiration

Use short-lived access tokens (15 minutes) and longer refresh tokens (7 days).

### 3. Secure Token Storage

- Store access tokens in memory (not localStorage)
- Store refresh tokens in httpOnly cookies
- Use HTTPS in production

### 4. Password Requirements

Enforce strong passwords:
```typescript
const passwordSchema = z.string()
  .min(8)
  .regex(/[A-Z]/, 'Must contain uppercase')
  .regex(/[a-z]/, 'Must contain lowercase')
  .regex(/[0-9]/, 'Must contain number')
```

### 5. Rate Limiting

Implement rate limiting for login attempts (see [Rate Limiting recipe](./rate-limiting.md)).

## Related Recipes

- [Authorization](./authorization.md) - Role-based access control
- [Rate Limiting](./rate-limiting.md) - Protecting authentication endpoints
- [Error Tracking](./error-tracking.md) - Monitoring auth failures

## Playground Example

See authentication implementation in:
- Directives: `playgrounds/nuxt/server/graphql/auth.directive.ts`
- Context: `playgrounds/nuxt/server/graphql/context.ts`
