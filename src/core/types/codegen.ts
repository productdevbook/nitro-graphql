/**
 * Codegen-specific types
 * Framework-agnostic type generation types
 *
 * These types extend the actual @graphql-codegen plugin types to be the single
 * authoritative source. Nitro types re-export from here instead of redefining.
 */

import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import type { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers'
import type { Source } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'

/**
 * Server codegen configuration
 * Extends @graphql-codegen/typescript + @graphql-codegen/typescript-resolvers
 */
export type ServerCodegenConfig = TypeScriptPluginConfig & TypeScriptResolversPluginConfig

/**
 * Client codegen configuration
 * Extends @graphql-codegen/typescript + @graphql-codegen/typescript-operations
 */
export type ClientCodegenConfig = TypeScriptPluginConfig & TypeScriptDocumentsPluginConfig & {
  /**
   * Generate TypedDocumentNode exports for urql/Apollo Client compatibility.
   * @default false
   */
  typedDocumentNode?: boolean
}

/**
 * SDK codegen configuration
 * Derives from the generic-sdk plugin's config parameter type with string documentMode
 */
type DocumentModeConfig = Pick<Parameters<typeof typescriptGenericSdk>[2], 'documentMode'>
type DocumentModeEnum = NonNullable<DocumentModeConfig['documentMode']>
type DocumentModeType = `${DocumentModeEnum}`

export type SdkCodegenConfig = Omit<Parameters<typeof typescriptGenericSdk>[2], 'documentMode'> & {
  documentMode?: DocumentModeType
}

/**
 * Input for server type generation
 */
export interface ServerCodegenInput {
  /** GraphQL framework name */
  framework: string
  /** Parsed GraphQL schema (optional if schemaString provided) */
  schema?: GraphQLSchema
  /** Schema as string (avoids graphql instance mismatch issues) */
  schemaString?: string
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
  /** Parsed GraphQL schema (optional if schemaString provided) */
  schema?: GraphQLSchema
  /** Schema as string (avoids graphql instance mismatch issues) */
  schemaString?: string
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
  schema?: string | string[]
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

