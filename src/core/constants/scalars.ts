/**
 * Default GraphQL scalar type definitions
 * Used by both server and client codegen
 */

import {
  CurrencyResolver,
  DateTimeISOResolver,
  DateTimeResolver,
  JSONObjectResolver,
  JSONResolver,
  NonEmptyStringResolver,
  UUIDResolver,
} from 'graphql-scalars'

/**
 * Default scalar type mappings for GraphQL codegen
 * These scalars are commonly used and have proper TypeScript type mappings
 */
export const DEFAULT_GRAPHQL_SCALARS = {
  DateTime: DateTimeResolver.extensions.codegenScalarType as string,
  DateTimeISO: DateTimeISOResolver.extensions.codegenScalarType as string,
  UUID: UUIDResolver.extensions.codegenScalarType as string,
  JSON: JSONResolver.extensions.codegenScalarType as string,
  JSONObject: JSONObjectResolver.extensions.codegenScalarType as string,
  NonEmptyString: NonEmptyStringResolver.extensions.codegenScalarType as string,
  Currency: CurrencyResolver.extensions.codegenScalarType as string,
  File: {
    input: 'File',
    output: 'File',
  },
} as const
