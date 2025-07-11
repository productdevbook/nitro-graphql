import type { YogaServerOptions } from 'graphql-yoga'
import type { GraphQLSchemaConfig, Resolvers } from 'nitro-graphql/types'
import { relative } from 'pathe'

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
const RELATIVE_RE = /^\.{1,2}\//

export function relativeWithDot(from: string, to: string) {
  const rel = relative(from, to)
  return RELATIVE_RE.test(rel) ? rel : `./${rel}`
}
