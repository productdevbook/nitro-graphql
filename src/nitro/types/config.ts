/**
 * Configuration types for Nitro GraphQL
 * NitroGraphQLOptions, ExternalGraphQLService, and all sub-configs
 */

import type { IResolvers } from '@graphql-tools/utils'
import type { ExternalServiceCodegenConfig } from '../../core/types/codegen'
import type { CoreFederationConfig } from '../../core/types/config'
import type { CodegenClientConfig, CodegenServerConfig, GenericSdkConfig, SecurityConfig } from './define'

// ==================== FILE GENERATION ====================

/**
 * File generation control:
 * - false: Do not generate this file
 * - true: Generate at default location
 * - string: Generate at custom path (supports placeholders: {serviceName}, {buildDir}, {rootDir}, {framework})
 */
export type FileGenerationConfig = boolean | string

/**
 * Service-specific path overrides for external GraphQL services
 * These paths override global config for this specific service
 */
export interface ExternalServicePaths {
  /** SDK file path (overrides global sdk.external config) */
  sdk?: FileGenerationConfig
  /** Type definitions file path (overrides global types.external config) */
  types?: FileGenerationConfig
  /** Ofetch client file path (overrides global clientUtils.ofetch config) */
  ofetch?: FileGenerationConfig
}

// ==================== EXTERNAL SERVICES ====================

/**
 * External GraphQL service configuration
 * Extends the core codegen type with Nitro-specific path overrides
 */
export interface ExternalGraphQLService extends ExternalServiceCodegenConfig {
  /**
   * Optional: Service-specific path overrides
   * These paths take precedence over global config (sdk, types, clientUtils)
   * Supports placeholders: {serviceName}, {buildDir}, {rootDir}, {framework}, {typesDir}, {clientDir}
   */
  paths?: ExternalServicePaths
}

// ==================== SUB-CONFIGS ====================

/**
 * Federation configuration
 * Extends core federation with Nitro-specific fields
 */
export interface FederationConfig extends CoreFederationConfig {
  /** Enable Apollo Federation subgraph support */
  enabled: boolean
  /** Service version for federation */
  serviceVersion?: string
  /** Service URL for federation gateway */
  serviceUrl?: string
}

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

// SecurityConfig is re-exported from core via define.ts (single source of truth)

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
  /** Debounce time in ms for file change detection */
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

// ==================== EXTEND SOURCES ====================

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

// LocalDirExtendSource is defined in core/extend/loader.ts (single source of truth)
export type { LocalDirExtendSource } from '../../core/extend/loader'

/**
 * Extend source - package path or detailed config
 * - string: package name or local path, requires nitro-graphql.config.ts in package root
 * - LocalDirExtendSource: local directories with serverDir/clientDir
 * - ExplicitPathsExtendSource: explicit paths (legacy)
 */
export type ExtendSource = string | LocalDirExtendSource | ExplicitPathsExtendSource

// ==================== MAIN OPTIONS ====================

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
}

/**
 * Extended options for standalone CLI usage
 * Adds fields that are implicit in Nitro module context (rootDir, buildDir, etc.)
 */
export interface CLIGraphQLOptions extends NitroGraphQLOptions {
  /** Root directory of the project (implicit in Nitro module context) */
  rootDir: string

  /** Build output directory (implicit in Nitro module context) */
  buildDir: string

  /** Server GraphQL directory (resolved) */
  serverDir: string

  /** Client GraphQL directory (resolved) */
  clientDir: string

  /** Types output directory */
  typesDir: string

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
  ignore: string[]

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
