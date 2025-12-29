import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import type { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers'
import type { IResolvers } from '@graphql-tools/utils'
import type { ESMCodeGenOptions } from 'knitwork'

export * from './standard-schema.ts'

export type CodegenServerConfig = TypeScriptPluginConfig & TypeScriptResolversPluginConfig

// CODEGEN
type DocumentModeConfig = Pick<Parameters<typeof typescriptGenericSdk>[2], 'documentMode'>
type DocumentModeEnum = NonNullable<DocumentModeConfig['documentMode']>
type DocumentModeType = `${DocumentModeEnum}`

export type GenericSdkConfig = Omit<Parameters<typeof typescriptGenericSdk>[2], 'documentMode'> & {
  documentMode?: DocumentModeType
}

export type CodegenClientConfig = TypeScriptPluginConfig & TypeScriptDocumentsPluginConfig & {
  endpoint?: string
  /**
   * Generate TypedDocumentNode exports for urql/Apollo Client compatibility.
   * When enabled, generates typed document constants that can be used with
   * any GraphQL client that supports TypedDocumentNode.
   * @default false
   */
  typedDocumentNode?: boolean
}

interface IESMImport {
  name: string
  as?: string
  type: 'resolver' | 'query' | 'mutation' | 'type' | 'subscription' | 'directive'
}

export interface GenImport {
  specifier: string
  imports: IESMImport[]
  options?: ESMCodeGenOptions
}

declare module 'nitro/types' {
  interface Nitro {
    scanSchemas: string[]
    scanDocuments: string[]
    scanResolvers: GenImport[]
    scanDirectives: GenImport[]
    graphql: {
      buildDir: string
      watchDirs: string[]
      clientDir: string
      serverDir: string
      dir: {
        build: string
        client: string
        server: string
      }
    }
  }
}

declare module 'nitro/types' {
  interface NitroOptions {
    graphql?: NitroGraphQLOptions
  }

  interface NitroRuntimeConfig {
    graphql?: NitroGraphQLOptions
  }

  interface NitroConfig {
    graphql?: NitroGraphQLOptions
  }
}

/**
 * Service-specific path overrides for external GraphQL services
 * These paths override global config for this specific service
 */
export interface ExternalServicePaths {
  /** SDK file path (overrides global sdk.external config) */
  sdk?: FileGenerationConfig
  /** Type definitions file path (overrides global types.external config) */
  types?: FileGenerationConfig
}

export interface ExternalGraphQLService {
  /** Unique name for this service (used for file naming and type generation) */
  name: string
  /** GraphQL endpoint for this service (also used as schema source if `schema` is not specified) */
  endpoint: string
  /**
   * Schema source - can be URL(s) for remote schemas or file path(s) for local schemas
   * @default Uses `endpoint` for introspection if not specified
   */
  schema?: string | string[]
  /** Optional headers for schema introspection and client requests */
  headers?: Record<string, string> | (() => Record<string, string>)
  /** Optional: specific document patterns for this service */
  documents?: string[]
  /**
   * Optional: Download and cache schema locally for offline usage
   * - true or 'once': Download if file doesn't exist, then use cached version (offline-friendly)
   * - 'always': Check for updates on every build (current behavior)
   * - 'manual': Never download automatically, user manages schema files manually
   * - false: Disable schema downloading
   */
  downloadSchema?: boolean | 'once' | 'always' | 'manual'
  /** Optional: Custom path to save downloaded schema (default: .nitro/graphql/schemas/[serviceName].graphql) */
  downloadPath?: string
  /** Optional: service-specific codegen configuration */
  codegen?: {
    client?: CodegenClientConfig
    clientSDK?: GenericSdkConfig
  }
  /**
   * Optional: Service-specific path overrides
   * These paths take precedence over global config (sdk, types, clientUtils)
   * Supports placeholders: {serviceName}, {buildDir}, {rootDir}, {framework}, {typesDir}, {clientGraphql}
   */
  paths?: ExternalServicePaths
}

export interface FederationConfig {
  /** Enable Apollo Federation subgraph support */
  enabled: boolean
  /** Service name for federation (used in subgraph config) */
  serviceName?: string
  /** Service version for federation */
  serviceVersion?: string
  /** Service URL for federation gateway */
  serviceUrl?: string
}

/**
 * File generation control:
 * - false: Do not generate this file
 * - true: Generate at default location
 * - string: Generate at custom path (supports placeholders: {serviceName}, {buildDir}, {rootDir}, {framework})
 */
export type FileGenerationConfig = boolean | string

/**
 * SDK files configuration
 * Control auto-generation of GraphQL SDK files
 */
export interface SdkConfig {
  /** Enable/disable all SDK files */
  enabled?: boolean
  /** app/graphql/default/sdk.ts - Main service SDK */
  main?: FileGenerationConfig
  /** app/graphql/{serviceName}/sdk.ts - External service SDKs */
  external?: FileGenerationConfig
}

/**
 * Type files configuration
 * Control auto-generation of TypeScript type definition files
 */
export interface TypesConfig {
  /** Enable/disable all type files */
  enabled?: boolean
  /** .nitro/types/nitro-graphql-server.d.ts - Server-side types */
  server?: FileGenerationConfig
  /** .nitro/types/nitro-graphql-client.d.ts - Client-side types */
  client?: FileGenerationConfig
  /** .nitro/types/nitro-graphql-client-{serviceName}.d.ts - External service types */
  external?: FileGenerationConfig
}

/**
 * Global path overrides
 * Set base directories for file generation
 */
export interface PathsConfig {
  /** Server GraphQL directory (default: 'server/graphql') */
  serverGraphql?: string
  /** Client GraphQL directory (default: 'app/graphql' for Nuxt, 'graphql' for Nitro) */
  clientGraphql?: string
  /** Build directory (default: '.nitro' or '.nuxt') */
  buildDir?: string
  /** Types directory (default: '{buildDir}/types') */
  typesDir?: string
}

/**
 * Security configuration for production environments
 * All options auto-detect based on NODE_ENV when not explicitly set
 */
export interface SecurityConfig {
  /**
   * Enable GraphQL introspection queries
   * @default true in development, false in production
   */
  introspection?: boolean
  /**
   * Enable GraphQL playground/sandbox UI
   * @default true in development, false in production
   */
  playground?: boolean
  /**
   * Mask internal error details in responses
   * When enabled, internal errors show "Internal server error" instead of actual message
   * @default false in development, true in production
   */
  maskErrors?: boolean
  /**
   * Disable "Did you mean X?" field suggestions in error messages
   * Prevents attackers from discovering field names via brute force
   * @default false in development, true in production
   */
  disableSuggestions?: boolean
}

export interface NitroGraphQLOptions {
  framework?: 'graphql-yoga' | 'apollo-server'
  /**
   * Enable/disable GraphQL server functionality
   * When set to false, only external services client types will be generated
   * Server routes, resolvers, schemas, and directives will not be processed
   * @default true
   */
  server?: boolean
  endpoint?: {
    graphql?: string
    healthCheck?: string
  }
  playground?: boolean
  typedefs?: string[]
  resolvers?: Array<IResolvers<any, any>>
  loader?: {
    include?: RegExp
    exclude?: RegExp
    validate?: boolean
  }
  codegen?: {
    server?: CodegenServerConfig
    client?: CodegenClientConfig
    clientSDK?: GenericSdkConfig
  }
  /** External GraphQL services to generate types and SDKs for */
  externalServices?: ExternalGraphQLService[]
  /** Apollo Federation configuration */
  federation?: FederationConfig
  /** Server GraphQL directory path */
  serverDir?: string
  /** Layer directories (populated by Nuxt module) */
  layerDirectories?: string[]
  layerServerDirs?: string[]
  layerAppDirs?: string[]
  /**
   * SDK files configuration
   * Set to false to disable all SDK generation
   */
  sdk?: false | SdkConfig
  /**
   * Type files configuration
   * Set to false to disable all type generation
   */
  types?: false | TypesConfig
  /**
   * Global path overrides
   * Customize base directories for file generation
   */
  paths?: PathsConfig
  /**
   * Security configuration for production environments
   * Auto-detects NODE_ENV and applies secure defaults in production
   */
  security?: SecurityConfig
}
