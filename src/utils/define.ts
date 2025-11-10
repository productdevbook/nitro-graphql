import type { NPMConfig, Resolvers, ResolversTypes } from '#graphql/server'
import type { ApolloServerOptions } from '@apollo/server'
import type { GraphQLSchema } from 'graphql'
import type { YogaServerOptions } from 'graphql-yoga'
import type { H3Event } from 'h3'

import type { StandardSchemaV1 } from 'nitro-graphql/types'

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

// Utility type for resolver usage
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

// GraphQL scalar types - simple list
export type GraphQLScalarType
  = | 'String'
    | 'Int'
    | 'Float'
    | 'Boolean'
    | 'ID'
    | 'JSON'
    | 'DateTime'

// Base types including scalars and any custom type
export type GraphQLBaseType = GraphQLScalarType | (string & {})

// GraphQL type with all possible combinations
export type GraphQLArgumentType
  // Basic scalars
  = | 'String'
    | 'Int'
    | 'Float'
    | 'Boolean'
    | 'ID'
    | 'JSON'
    | 'DateTime'
  // Non-nullable scalars
    | 'String!'
    | 'Int!'
    | 'Float!'
    | 'Boolean!'
    | 'ID!'
    | 'JSON!'
    | 'DateTime!'
  // Array types (all 4 combinations for each)
    | '[String]'
    | '[String!]'
    | '[String]!'
    | '[String!]!'
    | '[Int]'
    | '[Int!]'
    | '[Int]!'
    | '[Int!]!'
    | '[Float]'
    | '[Float!]'
    | '[Float]!'
    | '[Float!]!'
    | '[Boolean]'
    | '[Boolean!]'
    | '[Boolean]!'
    | '[Boolean!]!'
    | '[ID]'
    | '[ID!]'
    | '[ID]!'
    | '[ID!]!'
    | '[JSON]'
    | '[JSON!]'
    | '[JSON]!'
    | '[JSON!]!'
    | '[DateTime]'
    | '[DateTime!]'
    | '[DateTime]!'
    | '[DateTime!]!'
  // Allow any string for custom types
    | (string & {})

export interface DirectiveArgument<T extends GraphQLArgumentType = GraphQLArgumentType> {
  /**
   * GraphQL type for the argument
   * @example 'String', 'Int!', '[String!]!', 'DateTime', 'JSON'
   */
  type: T
  defaultValue?: any
  description?: string
}

interface DirectiveArg {
  type: GraphQLArgumentType
  defaultValue?: any
  description?: string
}

export interface DirectiveDefinition {
  name: string
  locations: DirectiveLocationName[]
  args?: Record<string, DirectiveArg>
  description?: string
  isRepeatable?: boolean
  transformer?: (schema: GraphQLSchema) => GraphQLSchema
}

// Helper type to create autocomplete-friendly directive config
export interface DefineDirectiveConfig {
  name: string
  locations: ReadonlyArray<DirectiveLocationName>
  args?: Record<string, {
    type: GraphQLArgumentType
    defaultValue?: any
    description?: string
  }>
  description?: string
  isRepeatable?: boolean
  transformer?: (schema: GraphQLSchema) => GraphQLSchema
}

/**
 * Helper function to create directive arguments with proper type inference
 * @example
 * args: {
 *   myArg: arg('String!', { defaultValue: 'hello' })
 * }
 */
export function arg<T extends GraphQLArgumentType>(type: T, options?: { defaultValue?: any, description?: string }): DirectiveArgument<T> {
  return {
    type,
    ...options,
  }
}

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
