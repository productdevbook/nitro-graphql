import type { NPMConfig, Resolvers, ResolversTypes } from '#graphql/server'
import type { ApolloServerOptions } from '@apollo/server'
import type { GraphQLSchema } from 'graphql'
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

type DirectiveLocationName
  = | 'QUERY'
    | 'MUTATION'
    | 'SUBSCRIPTION'
    | 'FIELD'
    | 'FRAGMENT_DEFINITION'
    | 'FRAGMENT_SPREAD'
    | 'INLINE_FRAGMENT'
    | 'VARIABLE_DEFINITION'
    | 'SCHEMA'
    | 'SCALAR'
    | 'OBJECT'
    | 'FIELD_DEFINITION'
    | 'ARGUMENT_DEFINITION'
    | 'INTERFACE'
    | 'UNION'
    | 'ENUM'
    | 'ENUM_VALUE'
    | 'INPUT_OBJECT'
    | 'INPUT_FIELD_DEFINITION'

export interface DirectiveDefinition {
  name: string
  locations: DirectiveLocationName[]
  args?: Record<string, {
    type: string
    defaultValue?: any
    description?: string
  }>
  description?: string
  isRepeatable?: boolean
  transformer?: (schema: GraphQLSchema) => GraphQLSchema
}

export function defineDirective(config: DirectiveDefinition): DirectiveDefinition {
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

  return config
}
