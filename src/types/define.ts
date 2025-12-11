import type { NPMConfig } from '#graphql/server'
import type { ApolloServerOptions } from '@apollo/server'
import type { GraphQLSchema } from 'graphql'
import type { YogaServerOptions } from 'graphql-yoga'
import type { H3Event } from 'nitro/h3'

export type Flatten<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export type DefineServerConfig<T extends NPMConfig = NPMConfig> = T['framework'] extends 'graphql-yoga'
  ? Partial<YogaServerOptions<H3Event, Partial<H3Event>>>
  : T['framework'] extends 'apollo-server'
    ? Partial<ApolloServerOptions<H3Event>>
    : Partial<YogaServerOptions<H3Event, Partial<H3Event>>> | Partial<ApolloServerOptions<H3Event>>

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
