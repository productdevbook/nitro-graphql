import type { ApolloServerOptions, BaseContext } from '@apollo/server'
import type { YogaServerOptions } from 'graphql-yoga'
import type { GraphQLFramework, GraphQLSchemaConfig, Resolvers } from 'nitro-graphql'

// TODO: check used.
export function defineSchema(config: GraphQLSchemaConfig): GraphQLSchemaConfig {
  return config
}

export function defineResolver(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

// Kullanım için utility type
export type ResolverQuery = Resolvers extends { Query: infer Q }
  ? Q
  : never

export function defineQuery(
  resolvers: Resolvers['Query'] = {},
): Resolvers {
  return {
    Query: {
      ...resolvers,
    },
  }
}

export function defineMutation(
  resolvers: Resolvers['Mutation'] = {},
): Resolvers {
  return {
    Mutation: {
      ...resolvers,
    },
  }
}

export function defineSubscription(
  resolvers: Resolvers['Subscription'] = {},
): Resolvers {
  return {
    Subscription: {
      ...resolvers,
    },
  }
}

export function defineType(
  resolvers: Resolvers,
): Resolvers {
  return resolvers
}

export type DefineServerConfig = GraphQLFramework extends 'graphql-yoga'
  ? Partial<YogaServerOptions<any, any>>
  : GraphQLFramework extends 'apollo-server'
    ? Partial<ApolloServerOptions<BaseContext>>
    : Record<string, any>

export function defineGraphQLConfig(
  config: Partial<DefineServerConfig>,
): Partial<DefineServerConfig> {
  return config
}
