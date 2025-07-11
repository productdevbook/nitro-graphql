import type { YogaServerOptions } from 'graphql-yoga'
import type { GraphQLSchemaConfig, Resolvers } from 'nitro-graphql/types'

// TODO: check used.
export function defineGraphQLSchema(config: GraphQLSchemaConfig): GraphQLSchemaConfig {
  return config
}

export function defineResolver(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

/**
 * Helper function to define GraphQL Yoga configuration with type safety
 */
export function defineYogaConfig<TServerContext = any, TUserContext = any>(
  config: Partial<YogaServerOptions<TServerContext, TUserContext>>,
): Partial<YogaServerOptions<TServerContext, TUserContext>> {
  return config
}
