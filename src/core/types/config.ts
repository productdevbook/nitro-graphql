/**
 * Core configuration types
 * Framework-agnostic configuration interfaces for nitro-graphql
 */

import type { GraphQLFramework } from '../constants'

/**
 * Core logger interface
 * Abstracts logging functionality for framework independence
 */
export interface CoreLogger {
  info: (message: string, ...args: unknown[]) => void
  warn: (message: string, ...args: unknown[]) => void
  error: (message: string, ...args: unknown[]) => void
  success: (message: string, ...args: unknown[]) => void
  debug: (message: string, ...args: unknown[]) => void
}

/**
 * GraphQL codegen configuration
 */
export interface CoreCodegenConfig {
  /** Server-side codegen options */
  server?: Record<string, unknown>
  /** Client-side codegen options */
  client?: Record<string, unknown>
  /** Client SDK codegen options */
  clientSDK?: Record<string, unknown>
}

/**
 * Security configuration options
 */
export interface CoreSecurityConfig {
  /** Enable/disable GraphQL introspection */
  introspection?: boolean
  /** Enable/disable GraphQL playground */
  playground?: boolean
  /** Enable/disable error masking in responses */
  maskErrors?: boolean
  /** Disable field suggestions in error messages */
  disableSuggestions?: boolean
}

/**
 * External GraphQL service configuration
 */
export interface CoreExternalService {
  /** Unique service name */
  name: string
  /** GraphQL schema URL or file path */
  schema: string
  /** GraphQL endpoint URL */
  endpoint: string
  /** Headers for schema introspection */
  headers?: Record<string, string> | (() => Record<string, string>)
  /** Document patterns for this service */
  documents?: string[]
  /** Service-specific path overrides */
  paths?: {
    sdk?: string
    types?: string
    ofetch?: string
  }
}

/**
 * Apollo Federation configuration
 */
export interface CoreFederationConfig {
  /** Enable federation support */
  enabled?: boolean
  /** Service name for federation */
  serviceName?: string
}

/**
 * Path configuration with placeholders
 */
export interface CorePathsConfig {
  /** Server GraphQL directory (default: 'server/graphql') */
  serverDir?: string
  /** Client GraphQL directory (default: 'app/graphql' or 'graphql') */
  clientDir?: string
  /** Types output directory (default: '{buildDir}/types') */
  typesDir?: string
}

/**
 * Scaffold file generation configuration
 */
export interface CoreScaffoldConfig {
  /** Master switch for all scaffold files */
  enabled?: boolean
  /** Generate graphql.config.ts */
  graphqlConfig?: boolean | string
  /** Generate server schema.ts */
  serverSchema?: boolean | string
  /** Generate server config.ts */
  serverConfig?: boolean | string
  /** Generate server context.d.ts */
  serverContext?: boolean | string
}

/**
 * Type generation configuration
 */
export interface CoreTypesConfig {
  /** Master switch for type generation */
  enabled?: boolean
  /** Server types output path */
  server?: boolean | string
  /** Client types output path */
  client?: boolean | string
  /** External service types output path */
  external?: boolean | string
}

/**
 * SDK generation configuration
 */
export interface CoreSdkConfig {
  /** Master switch for SDK generation */
  enabled?: boolean
  /** Main SDK output path */
  main?: boolean | string
  /** External service SDK output path */
  external?: boolean | string
}

/**
 * Client utilities configuration
 */
export interface CoreClientUtilsConfig {
  /** Master switch for client utilities */
  enabled?: boolean
  /** Index file output path */
  index?: boolean | string
  /** Ofetch client output path */
  ofetch?: boolean | string
}

/**
 * Core GraphQL options
 * Framework-agnostic GraphQL configuration
 */
export interface CoreGraphQLOptions {
  /** GraphQL framework to use */
  framework?: GraphQLFramework
  /** GraphQL endpoint path */
  endpoint?: string
  /** Codegen configuration */
  codegen?: CoreCodegenConfig
  /** Security configuration */
  security?: CoreSecurityConfig
  /** External GraphQL services */
  externalServices?: CoreExternalService[]
  /** Apollo Federation configuration */
  federation?: CoreFederationConfig
  /** Path configuration */
  paths?: CorePathsConfig
  /** Scaffold file configuration */
  scaffold?: false | CoreScaffoldConfig
  /** Type generation configuration */
  types?: false | CoreTypesConfig
  /** SDK generation configuration */
  sdk?: false | CoreSdkConfig
  /** Client utilities configuration */
  clientUtils?: false | CoreClientUtilsConfig
}

/**
 * Core configuration
 * Main configuration interface that replaces Nitro-specific options
 */
export interface CoreConfig {
  /** Root directory of the project */
  rootDir: string
  /** Build output directory */
  buildDir: string
  /** Server GraphQL directory */
  serverDir: string
  /** Client GraphQL directory */
  clientDir: string
  /** Types output directory */
  typesDir: string
  /** GraphQL framework to use */
  framework: GraphQLFramework
  /** Whether running in Nuxt context */
  isNuxt: boolean
  /** Whether running in development mode */
  isDev: boolean
  /** GraphQL options */
  graphqlOptions: CoreGraphQLOptions
  /** Logger instance */
  logger: CoreLogger
  /** Patterns to ignore during scanning */
  ignorePatterns: string[]
  /** Layer server directories (Nuxt) */
  layerServerDirs?: string[]
  /** Layer app directories (Nuxt) */
  layerAppDirs?: string[]
}

/**
 * Core context for runtime operations
 * Holds resolved configuration and state
 */
export interface CoreContext {
  /** Resolved configuration */
  config: CoreConfig
  /** GraphQL build directory */
  graphqlBuildDir: string
  /** Watch directories for file watching */
  watchDirs: string[]
  /** Relative directory paths */
  dir: {
    build: string
    client: string
    server: string
  }
}
