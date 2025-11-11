import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver, GraphQLError } from 'graphql'
import { defineDirective } from 'nitro-graphql/define'

// Simple in-memory rate limiter
const rateLimitStore = new Map<string, { count: number, resetAt: number }>()

/**
 * @rateLimit directive - Rate limiting for GraphQL fields
 *
 * Examples:
 * - @rateLimit(limit: 10, window: 60) - 10 requests per 60 seconds
 * - @rateLimit(limit: 100, window: 3600, skipIf: ["ADMIN", "PREMIUM"]) - Skip for certain roles
 * - @rateLimit(limit: 5, window: 60, keyBy: ["userId", "ip"]) - Rate limit by multiple keys
 */
export const rateLimitDirective = defineDirective({
  name: 'rateLimit',
  locations: ['FIELD_DEFINITION', 'OBJECT'],
  args: {
    limit: {
      type: 'Int!',
      description: 'Maximum number of requests',
    },
    window: {
      type: 'Int!',
      defaultValue: 60,
      description: 'Time window in seconds',
    },
    skipIf: {
      type: '[String!]',
      description: 'Skip rate limiting for these roles',
    },
    keyBy: {
      type: '[String!]',
      defaultValue: ['ip'],
      description: 'Fields to use for rate limit key (e.g., userId, ip)',
    },
    message: {
      type: 'String',
      defaultValue: 'Too many requests',
      description: 'Custom error message',
    },
    burst: {
      type: 'Int',
      description: 'Allow burst requests above limit',
    },
    cost: {
      type: 'Float',
      defaultValue: 1.0,
      description: 'Cost of this operation (for weighted rate limiting)',
    },
  },
  description: 'Apply rate limiting to fields or objects',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const rateLimitConfig = getDirective(schema, fieldConfig, 'rateLimit')?.[0]

        if (rateLimitConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            const { limit, window, skipIf, keyBy, message, burst, cost } = rateLimitConfig

            // Check if should skip
            if (skipIf && context.user?.roles) {
              const shouldSkip = skipIf.some(role => context.user.roles.includes(role))
              if (shouldSkip) {
                return resolve(source, args, context, info)
              }
            }

            // Generate rate limit key
            const keyParts = keyBy.map((field) => {
              switch (field) {
                case 'userId':
                  return context.user?.id || 'anonymous'
                case 'ip':
                  return context.ip || 'unknown'
                case 'fieldName':
                  return info.fieldName
                default:
                  return context[field] || 'unknown'
              }
            })
            const rateLimitKey = `rateLimit:${keyParts.join(':')}`

            // Check rate limit
            const now = Date.now()
            const windowMs = window * 1000
            let record = rateLimitStore.get(rateLimitKey)

            if (!record || record.resetAt < now) {
              record = { count: 0, resetAt: now + windowMs }
              rateLimitStore.set(rateLimitKey, record)
            }

            record.count += cost

            const effectiveLimit = burst ? limit + burst : limit

            if (record.count > effectiveLimit) {
              const resetIn = Math.ceil((record.resetAt - now) / 1000)
              throw new GraphQLError(message, {
                extensions: {
                  code: 'RATE_LIMITED',
                  limit,
                  window,
                  resetIn,
                },
              })
            }

            // Add rate limit info to response headers if available
            if (context.response?.headers) {
              context.response.headers.set('X-RateLimit-Limit', String(limit))
              context.response.headers.set('X-RateLimit-Remaining', String(Math.max(0, limit - record.count)))
              context.response.headers.set('X-RateLimit-Reset', String(Math.floor(record.resetAt / 1000)))
            }

            return resolve(source, args, context, info)
          }
        }

        return fieldConfig
      },
    })
  },
})
