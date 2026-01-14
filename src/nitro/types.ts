/**
 * Nitro GraphQL type definitions
 * Merged from types/index.ts, types/define.ts, types/standard-schema.ts
 */

import type { NPMConfig } from '#graphql/server'
import type { ApolloServerOptions } from '@apollo/server'
import type { TypeScriptPluginConfig } from '@graphql-codegen/typescript'
import type { plugin as typescriptGenericSdk } from '@graphql-codegen/typescript-generic-sdk'
import type { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations'
import type { TypeScriptResolversPluginConfig } from '@graphql-codegen/typescript-resolvers'
import type { IResolvers } from '@graphql-tools/utils'
import type { GraphQLSchema } from 'graphql'
import type { YogaServerOptions } from 'graphql-yoga'
import type { ESMCodeGenOptions } from 'knitwork'
import type { H3Event } from 'nitro/h3'

// ==================== STANDARD SCHEMA ====================

/** The Standard Schema interface. */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  /** The Standard Schema properties. */
  readonly '~standard': StandardSchemaV1.Props<Input, Output>
}

// eslint-disable-next-line ts/no-namespace
export declare namespace StandardSchemaV1 {
  /** The Standard Schema properties interface. */
  export interface Props<Input = unknown, Output = Input> {
    /** The version number of the standard. */
    readonly version: 1
    /** The vendor name of the schema library. */
    readonly vendor: string
    /** Validates unknown input values. */
    readonly validate: (
      value: unknown,
    ) => Result<Output> | Promise<Result<Output>>
    /** Inferred types associated with the schema. */
    readonly types?: Types<Input, Output> | undefined
  }

  /** The result interface of the validate function. */
  export type Result<Output> = SuccessResult<Output> | FailureResult

  /** The result interface if validation succeeds. */
  export interface SuccessResult<Output> {
    /** The typed output value. */
    readonly value: Output
    /** The non-existent issues. */
    readonly issues?: undefined
  }

  /** The result interface if validation fails. */
  export interface FailureResult {
    /** The issues of failed validation. */
    readonly issues: ReadonlyArray<Issue>
  }

  /** The issue interface of the failure output. */
  export interface Issue {
    /** The error message of the issue. */
    readonly message: string
    /** The path of the issue, if any. */
    readonly path?: ReadonlyArray<PropertyKey | PathSegment> | undefined
  }

  /** The path segment interface of the issue. */
  export interface PathSegment {
    /** The key representing a path segment. */
    readonly key: PropertyKey
  }

  /** The Standard Schema types interface. */
  export interface Types<Input = unknown, Output = Input> {
    /** The input type of the schema. */
    readonly input: Input
    /** The output type of the schema. */
    readonly output: Output
  }

  /** Infers the input type of a Standard Schema. */
  export type InferInput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['input']

  /** Infers the output type of a Standard Schema. */
  export type InferOutput<Schema extends StandardSchemaV1> = NonNullable<
    Schema['~standard']['types']
  >['output']

  // biome-ignore lint/complexity/noUselessEmptyExport: needed for granular visibility control of TS namespace
  export {}
}

// ==================== DEFINE TYPES ====================

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

// ==================== CODEGEN TYPES ====================

export type CodegenServerConfig = TypeScriptPluginConfig & TypeScriptResolversPluginConfig & {
  /**
   * Skip validation schemas import and related types.
   * Use this for non-Nitro frameworks (e.g., Vercube) that don't have #nitro-graphql virtual modules.
   * @default false
   */
  skipValidationSchemas?: boolean
}

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

// ==================== NITRO MODULE AUGMENTATION ====================

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
      /** Inline directive schemas generated from .directive.ts files */
      directiveSchemas: string | null
      /** Resolved extend paths from manifests (populated during setup) */
      resolvedExtend?: {
        schemas: string[]
        resolvers: string[]
        directives: string[]
      }
      /** Config paths from extend packages (for merging) */
      extendConfigs: string[]
      /** Schema.ts paths from extend packages (for merging) */
      extendSchemas: string[]
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

// ==================== CONFIGURATION TYPES ====================

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
   * Supports placeholders: {serviceName}, {buildDir}, {rootDir}, {framework}, {typesDir}, {clientDir}
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

/**
 * WebSocket transport configuration for subscriptions
 */
export interface WebSocketTransportConfig {
  /**
   * Enable WebSocket transport
   * @default true when subscriptions.enabled is true
   */
  enabled?: boolean
  /**
   * WebSocket endpoint path
   * @default Same as GraphQL HTTP endpoint
   */
  path?: string
  /**
   * Connection initialization timeout in milliseconds
   * @default 10000
   */
  connectionTimeout?: number
  /**
   * Keep-alive ping interval in milliseconds
   * @default 30000
   */
  pingInterval?: number
}

/**
 * SSE (Server-Sent Events) transport configuration for subscriptions
 * Only available with GraphQL Yoga framework
 */
export interface SSETransportConfig {
  /**
   * Enable SSE transport
   * @default true for GraphQL Yoga
   */
  enabled?: boolean
}

/**
 * PubSub configuration for subscription event distribution
 */
export interface PubSubConfig {
  /**
   * Use built-in in-memory PubSub
   * Suitable for single-instance deployments
   * @default true
   */
  useBuiltin?: boolean
  /**
   * Path to custom PubSub module
   * The module should export a PubSub-compatible instance
   * When provided, built-in PubSub is disabled
   */
  customPath?: string
}

/**
 * GraphQL Subscriptions configuration
 */
export interface SubscriptionsConfig {
  /**
   * Enable subscriptions support
   * @default false
   */
  enabled?: boolean
  /**
   * WebSocket transport configuration
   */
  websocket?: WebSocketTransportConfig
  /**
   * SSE transport configuration (GraphQL Yoga only)
   */
  sse?: SSETransportConfig
  /**
   * PubSub configuration for event distribution
   */
  pubsub?: PubSubConfig
}

/**
 * Client utilities configuration
 * Controls auto-generation of client utility files
 */
export interface ClientUtilsConfig {
  /** Master switch for client utilities */
  enabled?: boolean
  /** Index file output path */
  index?: FileGenerationConfig
  /** Ofetch client output path */
  ofetch?: FileGenerationConfig
}

/**
 * Path configuration with placeholders
 * Supports: {buildDir}, {rootDir}, {typesDir}, {serverDir}, {clientDir}, {serviceName}
 */
export interface PathsConfig {
  /** Server GraphQL directory (default: 'server/graphql') */
  serverDir?: string
  /** Client GraphQL directory (default: 'app/graphql' or 'graphql') */
  clientDir?: string
  /** Types output directory (default: '{buildDir}/types') */
  typesDir?: string
}

/**
 * Watch mode configuration
 */
export interface WatchConfig {
  /** Enable watch mode */
  enabled?: boolean
  /** Debounce time in ms */
  debounce?: number
}

/**
 * Runtime file generation configuration
 * Generates resolvers.ts, schema.ts for standalone server usage
 */
export interface RuntimeConfig {
  /** Output directory for runtime files (defaults to '{buildDir}/runtime') */
  outDir?: string
  /** What to include in generation */
  include?: {
    resolvers?: boolean
    schema?: boolean
    index?: boolean
  }
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
  /** Server GraphQL directory path (default: 'server/graphql') */
  serverDir?: string
  /** Client GraphQL directory path (default: 'app/graphql' for Nuxt, 'graphql' for Nitro) */
  clientDir?: string
  /** Types directory path (default: '{buildDir}/types') */
  typesDir?: string
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
   * Security configuration for production environments
   * Auto-detects NODE_ENV and applies secure defaults in production
   */
  security?: SecurityConfig

  /**
   * Extend GraphQL server with external packages
   * Auto-appends /resolvers and /schema to each package path
   * @example extend: ['@myorg/graphql', './generated']
   */
  extend?: ExtendSource[]

  /**
   * Skip local file scanning, use only extend sources
   * When true, only files from `extend` are used (local server/graphql ignored)
   * @default false
   */
  skipLocalScan?: boolean

  /**
   * GraphQL Subscriptions configuration
   * Enables real-time subscriptions via WebSocket and/or SSE transports
   */
  subscriptions?: SubscriptionsConfig

  // ==================== CLI OPTIONS ====================
  // These options enable standalone CLI usage without Nitro module

  /**
   * Root directory of the project
   * Used by CLI for path resolution. In Nitro module context, this is implicit.
   */
  rootDir?: string

  /**
   * Build output directory
   * Used by CLI for generated files. In Nitro module context, this is implicit.
   */
  buildDir?: string

  /**
   * Client utilities configuration
   * Controls auto-generation of client utility files (index.ts, ofetch.ts)
   * Set to false to disable all client utilities generation
   */
  clientUtils?: false | ClientUtilsConfig

  /**
   * Path configuration with placeholders
   * Allows overriding default paths for generated files
   */
  paths?: PathsConfig

  /**
   * Patterns to ignore during file scanning
   * Defaults to node_modules and dist directories
   */
  ignore?: string[]

  /**
   * Watch mode configuration
   * Enables automatic type regeneration on file changes
   */
  watch?: WatchConfig

  /**
   * Runtime file generation configuration
   * Generates resolvers.ts, schema.ts for standalone server usage
   * Set to true for default behavior or provide config object
   */
  runtime?: boolean | RuntimeConfig
}

/**
 * Explicit paths extend source (legacy)
 */
export interface ExplicitPathsExtendSource {
  /** Explicit manifest path */
  manifest?: string
  /** Explicit resolver paths (legacy, prefer manifest) */
  resolvers?: string | string[]
  /** Explicit schema paths (legacy, prefer manifest) */
  schemas?: string | string[]
}

/**
 * Local directory extend source
 * For extending from local directories (e.g., Nuxt layers, monorepo packages)
 */
export interface LocalDirExtendSource {
  /** Server GraphQL directory path (for schemas, resolvers, directives) */
  serverDir?: string
  /** Client GraphQL directory path (for documents) */
  clientDir?: string
}

/**
 * Extend source - package path or detailed config
 * - string: package name or local path, requires nitro-graphql.config.ts in package root
 * - LocalDirExtendSource: local directories with serverDir/clientDir
 * - ExplicitPathsExtendSource: explicit paths (legacy)
 */
export type ExtendSource = string | LocalDirExtendSource | ExplicitPathsExtendSource
