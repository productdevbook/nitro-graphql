import { getDirective, MapperKind, mapSchema } from '@graphql-tools/utils'
import { defaultFieldResolver } from 'graphql'

// Simple in-memory cache for demo purposes
const cache = new Map<string, { value: any, expires: number }>()

export const cacheDirective = defineDirective({
  name: 'cache',
  locations: ['FIELD_DEFINITION'],
  args: {
    ttl: {
      type: 'Int',
      defaultValue: 60,
      description: 'Time to live in seconds',
    },
    scope: {
      type: 'String',
      defaultValue: 'PUBLIC',
      description: 'Cache scope: PUBLIC or PRIVATE',
    },
  },
  description: 'Directive for caching field results',
  transformer: (schema) => {
    return mapSchema(schema, {
      [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
        const cacheConfig = getDirective(schema, fieldConfig, 'cache')?.[0]

        if (cacheConfig) {
          const { resolve = defaultFieldResolver } = fieldConfig

          fieldConfig.resolve = async function (source, args, context, info) {
            // Generate cache key
            const fieldName = info.fieldName
            const argsKey = JSON.stringify(args)
            const scopeKey = cacheConfig.scope === 'PRIVATE' ? context.user?.id || 'anonymous' : 'public'
            const cacheKey = `${fieldName}:${argsKey}:${scopeKey}`

            // Check cache
            const cached = cache.get(cacheKey)
            if (cached && cached.expires > Date.now()) {
              console.log(`Cache hit for ${cacheKey}`)
              return cached.value
            }

            // Execute resolver
            const result = await resolve(source, args, context, info)

            // Store in cache
            cache.set(cacheKey, {
              value: result,
              expires: Date.now() + (cacheConfig.ttl * 1000),
            })
            console.log(`Cached ${cacheKey} for ${cacheConfig.ttl}s`)

            return result
          }
        }

        return fieldConfig
      },
    })
  },
})
