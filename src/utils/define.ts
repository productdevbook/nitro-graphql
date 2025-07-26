import type { NPMConfig, Resolvers, ResolversTypes } from '#graphql/server'
import type { ApolloServerOptions } from '@apollo/server'
import type { YogaServerOptions } from 'graphql-yoga'
import type { H3Event } from 'h3'

import type { StandardSchemaV1 } from 'nitro-graphql'

type Flatten<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export function defineSchema<T extends Partial<Record<keyof ResolversTypes, StandardSchemaV1>>>(
  config: T,
): Flatten<T> {
  return config as any
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

export type DefineServerConfig<T extends NPMConfig = NPMConfig> = T['framework'] extends 'graphql-yoga'
  ? Partial<YogaServerOptions<H3Event, Partial<H3Event>>>
  : T['framework'] extends 'apollo-server'
    ? Partial<ApolloServerOptions<H3Event>>
    : Partial<YogaServerOptions<H3Event, Partial<H3Event>>> | Partial<ApolloServerOptions<H3Event>>

export function defineGraphQLConfig<T extends NPMConfig = NPMConfig>(
  config: Partial<DefineServerConfig<T>>,
): Partial<DefineServerConfig<T>> {
  return config
}
