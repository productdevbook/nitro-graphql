/**
 * Define function types
 * Framework-agnostic type definitions for GraphQL directives and configs
 */

import type { GraphQLSchema } from 'graphql'

export type Flatten<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

export type DirectiveLocationName
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

// GraphQL type modifiers for building argument types
type GraphQLModifier = '' | '!' | '[]' | '[!]' | '[!]!'

// GraphQL type with all possible combinations via template literal
export type GraphQLArgumentType = `${GraphQLScalarType}${GraphQLModifier}` | `${GraphQLBaseType}${GraphQLModifier}` | (string & {})

/** Allowed default values for directive arguments */
export type DirectiveDefaultValue = string | number | boolean | null

export interface DirectiveArgument<T extends GraphQLArgumentType = GraphQLArgumentType> {
  /**
   * GraphQL type for the argument
   * @example 'String', 'Int!', '[String!]!', 'DateTime', 'JSON'
   */
  type: T
  defaultValue?: DirectiveDefaultValue
  description?: string
}

export interface DirectiveArg {
  type: GraphQLArgumentType
  defaultValue?: DirectiveDefaultValue
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
    defaultValue?: DirectiveDefaultValue
    description?: string
  }>
  description?: string
  isRepeatable?: boolean
  transformer?: (schema: GraphQLSchema) => GraphQLSchema
}
