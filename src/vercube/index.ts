/**
 * Vercube GraphQL Integration
 *
 * Provides GraphQL integration for Vercube framework using nitro-graphql core.
 *
 * @example
 * ```typescript
 * import { Resolver, Query, Mutation } from 'nitro-graphql/vercube'
 * import type { QueryResolvers, MutationResolvers } from './.graphql/types/nitro-graphql-server'
 *
 * @Resolver()
 * class UserResolver implements Partial<QueryResolvers<Context>> {
 *   @Query('users')
 *   users(_parent: {}, _args: {}, ctx: Context) {
 *     return ctx.db.users.findAll()
 *   }
 * }
 * ```
 */

// Adapter (standalone usage)
export { VercubeGraphQLAdapter } from './adapter'

// Decorators
export {
  FieldResolver,
  Mutation,
  Query,
  Resolver,
  resolverClasses,
  Subscription,
} from './decorators'

// Plugin
export { GRAPHQL_PLUGIN, GraphQLPlugin } from './plugin'

// Types
export type { ResolverMetadata } from './types'
