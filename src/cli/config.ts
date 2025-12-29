/**
 * CLI Configuration
 * Standalone config file format for nitro-graphql CLI
 */

import type { GraphQLFramework } from '../core/constants'
import type {
  CoreClientUtilsConfig,
  CoreCodegenConfig,
  CoreExternalService,
  CoreFederationConfig,
  CorePathsConfig,
  CoreScaffoldConfig,
  CoreSdkConfig,
  CoreSecurityConfig,
  CoreTypesConfig,
} from '../core/types'

/**
 * CLI configuration options
 * Used when running nitro-graphql as a standalone CLI tool
 */
export interface CLIConfig {
  /** Root directory (defaults to current working directory) */
  rootDir?: string

  /** Build output directory */
  buildDir?: string

  /** Server GraphQL directory (defaults to 'server/graphql') */
  serverDir?: string

  /** Client GraphQL directory (defaults to 'graphql') */
  clientDir?: string

  /** Types output directory */
  typesDir?: string

  /** GraphQL framework (defaults to 'graphql-yoga') */
  framework?: GraphQLFramework

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

  /** Patterns to ignore during scanning */
  ignore?: string[]

  /** Watch mode configuration */
  watch?: {
    /** Enable watch mode */
    enabled?: boolean
    /** Debounce time in ms */
    debounce?: number
  }
}

/**
 * Define CLI configuration with type safety
 */
export function defineConfig(config: CLIConfig): CLIConfig {
  return config
}

/**
 * Default CLI configuration values
 */
export const DEFAULT_CLI_CONFIG: CLIConfig = {
  framework: 'graphql-yoga',
  serverDir: 'server/graphql',
  clientDir: 'graphql',
  buildDir: '.graphql',
  ignore: ['**/node_modules/**', '**/dist/**'],
}
