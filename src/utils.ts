import type { YogaServerOptions } from 'graphql-yoga'
import type { GraphQLSchemaConfig, Resolvers } from './types'

// TODO: check used.
export function defineGraphQLSchema(config: GraphQLSchemaConfig): GraphQLSchemaConfig {
  return config
}

export function defineResolver(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | undefined

  return function (...args: Parameters<T>) {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Helper function to define GraphQL Yoga configuration with type safety
 */
export function defineYogaConfig<TServerContext = any, TUserContext = any>(
  config: Partial<YogaServerOptions<TServerContext, TUserContext>>,
): Partial<YogaServerOptions<TServerContext, TUserContext>> {
  return config
}
