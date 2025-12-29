import type { NPMConfig, Resolvers, ResolversTypes } from '#graphql/server'

import type { DefineDirectiveConfig, DefineServerConfig, DirectiveDefinition, Flatten } from './ecosystem/nitro/types/define'
import type { StandardSchemaV1 } from './ecosystem/nitro/types/standard-schema'

/**
 * Define schema extensions programmatically for GraphQL types.
 *
 * This function allows you to provide runtime schema definitions that extend
 * your GraphQL types with additional validation or transformation logic using
 * StandardSchemaV1 compliant validators (e.g., Valibot, Zod, ArkType).
 *
 * @template T - A partial record mapping GraphQL type names to their schema definitions
 * @param config - An object mapping GraphQL type names to StandardSchemaV1 schema instances
 * @returns The flattened schema configuration with proper type inference
 *
 * @example
 * ```typescript
 * import * as v from 'valibot'
 *
 * export const schemas = defineSchema({
 *   CreateUserInput: v.object({
 *     email: v.pipe(v.string(), v.email()),
 *     age: v.pipe(v.number(), v.minValue(18))
 *   })
 * })
 * ```
 */
export function defineSchema<T extends Partial<Record<keyof ResolversTypes, StandardSchemaV1>>>(
  config: T,
): Flatten<T> {
  return config as any
}

/**
 * Define a complete GraphQL resolver object with full type safety.
 *
 * Use this function when you need to define multiple resolver types (Query, Mutation,
 * Subscription, and custom types) in a single resolver file. This provides type inference
 * and auto-completion for all resolver fields.
 *
 * @param resolvers - A complete resolver object containing Query, Mutation, Subscription, or custom type resolvers
 * @returns The same resolver object with preserved type information
 *
 * @example
 * ```typescript
 * export const userResolvers = defineResolver({
 *   Query: {
 *     user: async (parent, { id }, context) => {
 *       return await context.storage.getItem(`user:${id}`)
 *     }
 *   },
 *   Mutation: {
 *     createUser: async (parent, { input }, context) => {
 *       const user = { id: generateId(), ...input }
 *       await context.storage.setItem(`user:${user.id}`, user)
 *       return user
 *     }
 *   },
 *   User: {
 *     fullName: (parent, args, context) => `${parent.firstName} ${parent.lastName}`
 *   }
 * })
 * ```
 */
export function defineResolver(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

/**
 * Define GraphQL Query resolvers with full type safety.
 *
 * Use this helper when you only need to define Query resolvers. It automatically
 * wraps your resolvers in the correct structure and provides type inference for
 * all query fields defined in your GraphQL schema.
 *
 * @param resolvers - An object containing Query field resolvers (defaults to empty object)
 * @returns A Resolvers object with the Query field populated
 *
 * @example
 * ```typescript
 * export const userQueries = defineQuery({
 *   user: async (parent, { id }, context) => {
 *     return await fetchUser(id)
 *   },
 *   users: async (parent, args, context) => {
 *     return await fetchAllUsers()
 *   }
 * })
 * ```
 *
 * @remarks
 * Named exports are required. Do not use default exports with this function.
 */
export function defineQuery(
  resolvers: Resolvers['Query'] = {},
): Resolvers {
  return {
    Query: {
      ...resolvers,
    },
  }
}

/**
 * Define GraphQL Mutation resolvers with full type safety.
 *
 * Use this helper when you only need to define Mutation resolvers. It automatically
 * wraps your resolvers in the correct structure and provides type inference for
 * all mutation fields defined in your GraphQL schema.
 *
 * @param resolvers - An object containing Mutation field resolvers (defaults to empty object)
 * @returns A Resolvers object with the Mutation field populated
 *
 * @example
 * ```typescript
 * export const userMutations = defineMutation({
 *   createUser: async (parent, { input }, context) => {
 *     const user = await context.db.users.create(input)
 *     return user
 *   },
 *   updateUser: async (parent, { id, input }, context) => {
 *     return await context.db.users.update(id, input)
 *   },
 *   deleteUser: async (parent, { id }, context) => {
 *     return await context.db.users.delete(id)
 *   }
 * })
 * ```
 *
 * @remarks
 * Named exports are required. Do not use default exports with this function.
 */
export function defineMutation(
  resolvers: Resolvers['Mutation'] = {},
): Resolvers {
  return {
    Mutation: {
      ...resolvers,
    },
  }
}

/**
 * Define GraphQL Subscription resolvers with full type safety.
 *
 * Use this helper when you need to define real-time Subscription resolvers. It automatically
 * wraps your resolvers in the correct structure and provides type inference for
 * all subscription fields defined in your GraphQL schema.
 *
 * @param resolvers - An object containing Subscription field resolvers (defaults to empty object)
 * @returns A Resolvers object with the Subscription field populated
 *
 * @example
 * ```typescript
 * import { Repeater } from '@repeaterjs/repeater'
 *
 * export const messageSubscriptions = defineSubscription({
 *   messageAdded: {
 *     subscribe: async function* (parent, { channelId }, context) {
 *       const pubsub = context.pubsub
 *       yield* pubsub.subscribe(`channel:${channelId}`)
 *     }
 *   },
 *   userStatusChanged: {
 *     subscribe: async (parent, args, context) => {
 *       return new Repeater(async (push, stop) => {
 *         // Real-time subscription logic
 *       })
 *     }
 *   }
 * })
 * ```
 *
 * @remarks
 * Named exports are required. Subscriptions require async iterators or generators.
 */
export function defineSubscription(
  resolvers: Resolvers['Subscription'] = {},
): Resolvers {
  return {
    Subscription: {
      ...resolvers,
    },
  }
}

/**
 * Define custom GraphQL type resolvers with full type safety.
 *
 * Use this function to define field resolvers for custom GraphQL types (non-scalar types).
 * This is useful for computed fields, field-level transformations, or resolving relationships
 * between types. The function provides type inference for all custom types in your schema.
 *
 * @param resolvers - An object containing custom type field resolvers
 * @returns The same resolver object with preserved type information
 *
 * @example
 * ```typescript
 * // For a User type with computed fields
 * export const userTypeResolvers = defineField({
 *   User: {
 *     fullName: (parent) => `${parent.firstName} ${parent.lastName}`,
 *     age: (parent) => {
 *       const today = new Date()
 *       return today.getFullYear() - parent.birthYear
 *     },
 *     posts: async (parent, _, context) => {
 *       return await context.db.posts.findByUserId(parent.id)
 *     }
 *   }
 * })
 * ```
 *
 * @remarks
 * This is functionally equivalent to defineResolver but semantically indicates
 * you're defining type-specific field resolvers rather than root-level operations.
 */
export function defineField(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

/**
 * Define GraphQL server configuration with full type safety.
 *
 * Use this function to configure your GraphQL server settings including schema,
 * context, plugins, and framework-specific options. Supports both GraphQL Yoga
 * and Apollo Server configurations with proper type inference.
 *
 * @template T - The NPMConfig type (GraphQL Yoga or Apollo Server config)
 * @param config - Partial server configuration object
 * @returns The same configuration object with preserved type information
 *
 * @example
 * ```typescript
 * import { createDefaultMaskError } from 'nitro-graphql/utils'
 *
 * // GraphQL Yoga configuration
 * export default defineGraphQLConfig({
 *   schema: {
 *     // Schema directives, custom scalars, etc.
 *   },
 *   context: async (event) => {
 *     return {
 *       user: await getUserFromEvent(event),
 *       db: getDatabase()
 *     }
 *   },
 *   maskedErrors: {
 *     maskError: createDefaultMaskError()
 *   },
 *   graphiql: true
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Apollo Server configuration
 * export default defineGraphQLConfig({
 *   apollo: {
 *     introspection: true,
 *     csrfPrevention: true,
 *     plugins: [ApolloServerPluginLandingPageGraphQLPlayground()]
 *   }
 * })
 * ```
 */
export function defineGraphQLConfig<T extends NPMConfig = NPMConfig>(
  config: Partial<DefineServerConfig<T>>,
): Partial<DefineServerConfig<T>> {
  return config
}

/**
 * Define a custom GraphQL directive with full type safety.
 *
 * This function creates a GraphQL directive definition that can be used to add
 * custom behavior to your GraphQL schema. It automatically generates the directive's
 * schema definition string and provides runtime transformation capabilities.
 *
 * @param config - The directive configuration object
 * @param config.name - The name of the directive (without the @ symbol)
 * @param config.locations - Array of GraphQL directive locations where this directive can be applied
 * @param config.args - Optional arguments the directive accepts with their types and default values
 * @param config.transformer - Optional function to transform the schema when this directive is applied
 * @returns A DirectiveDefinition object with the schema definition and runtime behavior
 *
 * @example
 * ```typescript
 * import { mapSchema, getDirective, MapperKind } from '@graphql-tools/utils'
 *
 * export const upperDirective = defineDirective({
 *   name: 'upper',
 *   locations: ['FIELD_DEFINITION'],
 *   transformer: (schema) => {
 *     return mapSchema(schema, {
 *       [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
 *         const directive = getDirective(schema, fieldConfig, 'upper')?.[0]
 *         if (directive) {
 *           const { resolve = defaultFieldResolver } = fieldConfig
 *           fieldConfig.resolve = async (source, args, context, info) => {
 *             const result = await resolve(source, args, context, info)
 *             return typeof result === 'string' ? result.toUpperCase() : result
 *           }
 *         }
 *         return fieldConfig
 *       }
 *     })
 *   }
 * })
 * ```
 *
 * @example
 * ```typescript
 * // Directive with arguments
 * export const authDirective = defineDirective({
 *   name: 'auth',
 *   locations: ['FIELD_DEFINITION', 'OBJECT'],
 *   args: {
 *     requires: {
 *       type: 'Role!',
 *       defaultValue: 'USER'
 *     }
 *   },
 *   transformer: (schema) => {
 *     // Implementation for auth checking
 *   }
 * })
 * ```
 *
 * @remarks
 * The generated directive schema definition is stored as a non-enumerable `__schema`
 * property on the returned object and is automatically included in your GraphQL schema.
 */
export function defineDirective(config: DefineDirectiveConfig): DirectiveDefinition {
  // Generate GraphQL schema string for the directive
  const args = config.args
    ? Object.entries(config.args)
        .map(([name, arg]) => {
          const defaultValue = arg.defaultValue !== undefined ? ` = ${JSON.stringify(arg.defaultValue)}` : ''
          return `${name}: ${arg.type}${defaultValue}`
        })
        .join(', ')
    : ''

  const argsString = args ? `(${args})` : ''
  const locations = config.locations.join(' | ')
  const schemaDefinition = `directive @${config.name}${argsString} on ${locations}`

  // Add a non-enumerable property to store the schema
  Object.defineProperty(config, '__schema', {
    value: schemaDefinition,
    enumerable: false,
    configurable: false,
    writable: false,
  })

  return {
    ...config,
    locations: [...config.locations], // Convert readonly array to mutable
  }
}
