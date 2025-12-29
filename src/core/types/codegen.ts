/**
 * Codegen-specific types
 * Framework-agnostic type generation types
 */

import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'

/**
 * Scalar type mapping (can be string or input/output object)
 */
export type ScalarType = string | { input: string, output: string }

/**
 * Server codegen configuration
 */
export interface ServerCodegenConfig {
  scalars?: Record<string, ScalarType>
  defaultScalarType?: string
  defaultMapper?: string
  contextType?: string
  maybeValue?: string
  inputMaybeValue?: string
  declarationKind?: string
  enumsAsTypes?: boolean
  federation?: boolean
  [key: string]: unknown
}

/**
 * Client codegen configuration
 */
export interface ClientCodegenConfig {
  emitLegacyCommonJSImports?: boolean
  useTypeImports?: boolean
  enumsAsTypes?: boolean
  strictScalars?: boolean
  maybeValue?: string
  inputMaybeValue?: string
  documentMode?: string
  pureMagicComment?: boolean
  dedupeOperationSuffix?: boolean
  rawRequest?: boolean
  scalars?: Record<string, ScalarType>
  typedDocumentNode?: boolean
  [key: string]: unknown
}

/**
 * SDK codegen configuration
 */
export interface SdkCodegenConfig extends ClientCodegenConfig {
  [key: string]: unknown
}

/**
 * Input for server type generation
 */
export interface ServerCodegenInput {
  /** GraphQL framework name */
  framework: string
  /** Parsed GraphQL schema */
  schema: GraphQLSchema
  /** Server codegen configuration */
  config?: ServerCodegenConfig
  /** Whether federation is enabled */
  federationEnabled?: boolean
  /** Output filename (optional) */
  outputPath?: string
}

/**
 * Result of server type generation
 */
export interface ServerCodegenResult {
  /** Generated TypeScript types content */
  types: string
  /** Printed GraphQL schema */
  schemaString: string
}

/**
 * Input for client type generation
 */
export interface ClientCodegenInput {
  /** Parsed GraphQL schema */
  schema: GraphQLSchema
  /** Loaded GraphQL documents */
  documents: Source[]
  /** Client codegen configuration */
  config?: ClientCodegenConfig
  /** SDK codegen configuration */
  sdkConfig?: SdkCodegenConfig
  /** Output filename (optional) */
  outputPath?: string
  /** Service name for external services */
  serviceName?: string
  /** Virtual types import path */
  virtualTypesPath?: string
  /** Generation options */
  options?: {
    silent?: boolean
    isInitial?: boolean
  }
}

/**
 * Result of client type generation
 */
export interface ClientCodegenResult {
  /** Generated TypeScript types content */
  types: string
  /** Generated SDK content */
  sdk: string
}

/**
 * External service configuration for codegen
 */
export interface ExternalServiceCodegenConfig {
  name: string
  schema: string | string[]
  endpoint: string
  headers?: Record<string, string> | (() => Record<string, string>)
  documents?: string[]
  downloadSchema?: boolean | 'once' | 'always' | 'manual'
  downloadPath?: string
  codegen?: {
    client?: ClientCodegenConfig
    clientSDK?: SdkCodegenConfig
  }
}

/**
 * Schema loading options
 */
export interface SchemaLoadOptions {
  headers?: Record<string, string>
  loaders?: unknown[]
}
