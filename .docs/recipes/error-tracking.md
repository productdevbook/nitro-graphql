# Error Tracking

Complete guide to implementing error tracking and monitoring in Nitro GraphQL with Sentry and structured logging.

## Overview

This recipe covers:
- Sentry integration for error tracking
- Structured logging with Pino
- Custom error handling
- Error reporting and alerting
- Performance monitoring
- Error context and breadcrumbs

## Sentry Integration

### 1. Install Sentry

```bash
pnpm add @sentry/node @sentry/integrations
```

### 2. Initialize Sentry

Create `server/utils/sentry.ts`:

```typescript
import * as Sentry from '@sentry/node'
import { ProfilingIntegration } from '@sentry/profiling-node'

const SENTRY_DSN = process.env.SENTRY_DSN
const ENVIRONMENT = process.env.NODE_ENV || 'development'

export function initSentry() {
  if (!SENTRY_DSN) {
    console.warn('⚠️  Sentry DSN not configured')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: ENVIRONMENT,
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    integrations: [
      new ProfilingIntegration(),
    ],
    beforeSend(event, hint) {
      // Don't send errors in development
      if (ENVIRONMENT === 'development') {
        console.error('Sentry event (not sent in dev):', hint.originalException)
        return null
      }

      // Filter out specific errors
      if (event.exception?.values?.[0]?.value?.includes('Rate limit exceeded')) {
        return null // Don't track rate limit errors
      }

      return event
    },
  })

  console.log('✅ Sentry initialized')
}

// Capture GraphQL error
export function captureGraphQLError(
  error: Error,
  context?: {
    operation?: string
    variables?: any
    userId?: string
    [key: string]: any
  }
) {
  Sentry.withScope((scope) => {
    scope.setContext('graphql', {
      operation: context?.operation,
      variables: context?.variables,
    })

    if (context?.userId) {
      scope.setUser({ id: context.userId })
    }

    // Add custom tags
    scope.setTag('graphql_operation', context?.operation || 'unknown')

    Sentry.captureException(error)
  })
}

// Capture message
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level)
}

// Set user context
export function setUserContext(user: { id: string; email?: string; username?: string }) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  })
}

// Add breadcrumb
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level: 'info',
    data,
  })
}
```

### 3. Initialize in Entry Point

Update `server/graphql/config.ts`:

```typescript
import { initSentry } from '../utils/sentry'

// Initialize Sentry on startup
initSentry()

export default defineGraphQLConfig({
  // ... your config
})
```

### 4. Add Error Handler Plugin

Create `server/graphql/plugins/error-handler.ts`:

```typescript
import { captureGraphQLError, addBreadcrumb } from '../../utils/sentry'
import { GraphQLError } from 'graphql'

export const errorHandlerPlugin = {
  onExecute({ args }) {
    // Add breadcrumb for operation
    addBreadcrumb(
      `Executing GraphQL operation: ${args.operationName || 'anonymous'}`,
      'graphql',
      {
        operationName: args.operationName,
        variables: args.variableValues,
      }
    )
  },

  onExecuteDone({ result, args }) {
    // Check for errors in result
    if (result.errors && result.errors.length > 0) {
      for (const error of result.errors) {
        // Skip expected errors
        if (isExpectedError(error)) {
          continue
        }

        // Capture error in Sentry
        captureGraphQLError(error.originalError || error, {
          operation: args.operationName,
          variables: args.variableValues,
          userId: args.contextValue.user?.id,
        })
      }
    }
  },
}

function isExpectedError(error: GraphQLError): boolean {
  const expectedCodes = [
    'UNAUTHENTICATED',
    'FORBIDDEN',
    'NOT_FOUND',
    'BAD_USER_INPUT',
    'RATE_LIMIT_EXCEEDED',
  ]

  return expectedCodes.includes(error.extensions?.code as string)
}
```

Register the plugin:

```typescript
export default defineGraphQLConfig({
  plugins: [errorHandlerPlugin],
})
```

## Structured Logging with Pino

### 1. Install Pino

```bash
pnpm add pino pino-pretty
```

### 2. Create Logger

Create `server/utils/logger.ts`:

```typescript
import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },
})

// Create child loggers for different contexts
export const graphqlLogger = logger.child({ context: 'graphql' })
export const databaseLogger = logger.child({ context: 'database' })
export const authLogger = logger.child({ context: 'auth' })

// Helper functions
export function logGraphQLOperation(
  operation: string,
  duration: number,
  userId?: string
) {
  graphqlLogger.info({
    operation,
    duration,
    userId,
    msg: `GraphQL operation: ${operation}`,
  })
}

export function logGraphQLError(
  operation: string,
  error: Error,
  userId?: string
) {
  graphqlLogger.error({
    operation,
    error: {
      message: error.message,
      stack: error.stack,
    },
    userId,
    msg: `GraphQL error in ${operation}`,
  })
}

export function logDatabaseQuery(
  query: string,
  duration: number,
  rowCount?: number
) {
  databaseLogger.debug({
    query,
    duration,
    rowCount,
    msg: 'Database query executed',
  })
}
```

### 3. Add Logging Plugin

Create `server/graphql/plugins/logging.ts`:

```typescript
import { logGraphQLOperation, logGraphQLError } from '../../utils/logger'

export const loggingPlugin = {
  onExecute({ args }) {
    const start = Date.now()

    return {
      onExecuteDone({ result }) {
        const duration = Date.now() - start

        if (result.errors && result.errors.length > 0) {
          for (const error of result.errors) {
            logGraphQLError(
              args.operationName || 'anonymous',
              error.originalError || error,
              args.contextValue.user?.id
            )
          }
        } else {
          logGraphQLOperation(
            args.operationName || 'anonymous',
            duration,
            args.contextValue.user?.id
          )
        }
      },
    }
  },
}
```

## Custom Error Types

Create structured error types:

Create `server/utils/errors.ts`:

```typescript
import { GraphQLError } from 'graphql'

export class ApplicationError extends GraphQLError {
  constructor(
    message: string,
    code: string,
    extensions?: Record<string, any>
  ) {
    super(message, {
      extensions: {
        code,
        ...extensions,
      },
    })
  }
}

export class ValidationError extends ApplicationError {
  constructor(message: string, field?: string) {
    super(message, 'VALIDATION_ERROR', { field })
  }
}

export class AuthenticationError extends ApplicationError {
  constructor(message = 'Authentication required') {
    super(message, 'UNAUTHENTICATED')
  }
}

export class AuthorizationError extends ApplicationError {
  constructor(message = 'Access denied') {
    super(message, 'FORBIDDEN')
  }
}

export class NotFoundError extends ApplicationError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      'NOT_FOUND',
      { resource, id }
    )
  }
}

export class RateLimitError extends ApplicationError {
  constructor(resetAt: Date) {
    super('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', { resetAt })
  }
}

export class ExternalAPIError extends ApplicationError {
  constructor(service: string, message: string) {
    super(
      `External API error from ${service}: ${message}`,
      'EXTERNAL_API_ERROR',
      { service }
    )
  }
}
```

Usage in resolvers:

```typescript
import { NotFoundError, ValidationError } from '../../utils/errors'

export const userResolvers = defineResolver({
  Query: {
    user: async (_parent, { id }, context) => {
      const user = await context.db.user.findUnique({
        where: { id },
      })

      if (!user) {
        throw new NotFoundError('User', id)
      }

      return user
    },
  },

  Mutation: {
    createUser: async (_parent, { input }, context) => {
      // Validate input
      if (!input.email.includes('@')) {
        throw new ValidationError('Invalid email format', 'email')
      }

      // Check for duplicate
      const existing = await context.db.user.findUnique({
        where: { email: input.email },
      })

      if (existing) {
        throw new ValidationError('Email already exists', 'email')
      }

      return await context.db.user.create({
        data: input,
      })
    },
  },
})
```

## Error Formatting

Format errors for consistent responses:

```typescript
export function formatError(error: GraphQLError) {
  const { message, extensions, path, locations } = error

  // Don't expose internal errors to clients
  if (process.env.NODE_ENV === 'production' && !extensions?.code) {
    return {
      message: 'Internal server error',
      extensions: {
        code: 'INTERNAL_SERVER_ERROR',
      },
    }
  }

  return {
    message,
    extensions: {
      code: extensions?.code || 'UNKNOWN_ERROR',
      ...extensions,
    },
    path,
    locations,
  }
}

export default defineGraphQLConfig({
  formatError,
})
```

## Performance Monitoring

### 1. Track Operation Performance

```typescript
import { logger } from '../utils/logger'

export const performancePlugin = {
  onExecute({ args }) {
    const start = Date.now()

    return {
      onExecuteDone() {
        const duration = Date.now() - start

        // Log slow queries
        if (duration > 1000) {
          logger.warn({
            operation: args.operationName,
            duration,
            msg: 'Slow GraphQL operation detected',
          })

          // Send to Sentry
          captureMessage(
            `Slow operation: ${args.operationName} (${duration}ms)`,
            'warning'
          )
        }

        // Track metrics
        trackMetric('graphql.operation.duration', duration, {
          operation: args.operationName || 'anonymous',
        })
      },
    }
  },
}
```

### 2. Database Query Monitoring

```typescript
import { PrismaClient } from '@prisma/client'

export const db = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
  ],
})

db.$on('query', (e) => {
  if (e.duration > 100) {
    logger.warn({
      query: e.query,
      duration: e.duration,
      msg: 'Slow database query',
    })
  }
})
```

## Error Reporting Dashboard

Create an error summary endpoint:

```typescript
export const errorStatsResolvers = defineResolver({
  Query {
    errorStats: async (_parent, { timeRange }, context) => {
      // Require admin
      requireRole(context.user, 'ADMIN')

      const errors = await redis.lrange('errors', 0, -1)
      const parsed = errors.map(e => JSON.parse(e))

      // Filter by time range
      const now = Date.now()
      const filtered = parsed.filter(e => {
        const age = now - e.timestamp
        return age < timeRange * 1000
      })

      // Aggregate stats
      const stats = {
        total: filtered.length,
        byCode: {} as Record<string, number>,
        byOperation: {} as Record<string, number>,
        recent: filtered.slice(0, 10),
      }

      for (const error of filtered) {
        stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1
        stats.byOperation[error.operation] = (stats.byOperation[error.operation] || 0) + 1
      }

      return stats
    },
  },
})
```

## Alert Configuration

Set up alerts for critical errors:

```typescript
import { captureMessage } from './sentry'

export async function checkErrorThreshold() {
  const errors = await redis.lrange('errors:recent', 0, -1)

  // Alert if more than 100 errors in last 5 minutes
  if (errors.length > 100) {
    captureMessage(
      `High error rate detected: ${errors.length} errors in 5 minutes`,
      'error'
    )

    // Send to monitoring service
    await sendAlert({
      level: 'critical',
      message: 'High error rate detected',
      count: errors.length,
    })
  }
}

// Run every minute
setInterval(checkErrorThreshold, 60000)
```

## Client-Side Error Handling

### 1. Error Display Component

```vue
<template>
  <div v-if="error" class="error-banner">
    <div class="error-content">
      <h3>{{ getErrorTitle(error) }}</h3>
      <p>{{ getErrorMessage(error) }}</p>

      <button
        v-if="canRetry(error)"
        @click="$emit('retry')"
      >
        Retry
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  error: any
}>()

function getErrorTitle(error: any): string {
  const code = error?.extensions?.code

  switch (code) {
    case 'UNAUTHENTICATED':
      return 'Authentication Required'
    case 'FORBIDDEN':
      return 'Access Denied'
    case 'NOT_FOUND':
      return 'Not Found'
    case 'RATE_LIMIT_EXCEEDED':
      return 'Too Many Requests'
    default:
      return 'Error'
  }
}

function getErrorMessage(error: any): string {
  return error?.message || 'An unexpected error occurred'
}

function canRetry(error: any): boolean {
  const code = error?.extensions?.code
  return !['UNAUTHENTICATED', 'FORBIDDEN', 'NOT_FOUND'].includes(code)
}
</script>
```

### 2. Error Logging to Backend

```typescript
export async function reportClientError(error: Error, context?: any) {
  try {
    await fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        url: window.location.href,
        userAgent: navigator.userAgent,
        context,
      }),
    })
  } catch (e) {
    console.error('Failed to report error:', e)
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  reportClientError(event.error, {
    type: 'uncaught',
  })
})

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  reportClientError(new Error(event.reason), {
    type: 'unhandled-rejection',
  })
})
```

## Testing Error Handling

```typescript
import { describe, it, expect } from 'vitest'
import { NotFoundError, ValidationError } from '../errors'

describe('Error Handling', () => {
  it('should throw NotFoundError with correct code', () => {
    const error = new NotFoundError('User', '123')

    expect(error.message).toContain('User')
    expect(error.message).toContain('123')
    expect(error.extensions?.code).toBe('NOT_FOUND')
  })

  it('should throw ValidationError with field info', () => {
    const error = new ValidationError('Invalid email', 'email')

    expect(error.message).toBe('Invalid email')
    expect(error.extensions?.code).toBe('VALIDATION_ERROR')
    expect(error.extensions?.field).toBe('email')
  })

  it('should handle errors in resolvers', async () => {
    const result = await execute({
      schema,
      document: parse(`
        query {
          user(id: "nonexistent") {
            id
          }
        }
      `),
    })

    expect(result.errors).toBeDefined()
    expect(result.errors?.[0].extensions?.code).toBe('NOT_FOUND')
  })
})
```

## Best Practices

### 1. Error Categories

Categorize errors appropriately:
- **Client Errors** (4xx): User input issues, authentication, authorization
- **Server Errors** (5xx): Database failures, external API errors, unexpected errors

### 2. Don't Expose Internal Details

Never expose:
- Database schemas
- Internal file paths
- Stack traces (in production)
- API keys or secrets

### 3. Log Context

Always include relevant context:
- User ID
- Operation name
- Request ID
- Timestamp

### 4. Monitor Error Rates

Set up alerts for:
- Sudden spike in errors
- High error rate (>1%)
- Specific error types

### 5. Error Recovery

Implement graceful degradation:
- Return cached data when possible
- Provide fallback values
- Retry with exponential backoff

## Environment Variables

```env
# Sentry
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=1.0

# Logging
LOG_LEVEL=info
```

## Related Recipes

- [Authentication](./authentication.md) - Authentication errors
- [Rate Limiting](./rate-limiting.md) - Rate limit error handling
- [Error Handling Guide](../guide/error-handling.md) - General error handling

## References

- [Sentry Documentation](https://docs.sentry.io/)
- [Pino Documentation](https://getpino.io/)
- [GraphQL Error Handling Best Practices](https://www.apollographql.com/docs/apollo-server/data/errors/)
