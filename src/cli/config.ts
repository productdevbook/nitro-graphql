/**
 * CLI Configuration
 * Standalone config file format for nitro-graphql CLI
 */

import type { CLIGraphQLOptions } from '../nitro/types'

/**
 * CLI configuration options
 * Extends NitroGraphQLOptions with CLI-specific fields (rootDir, buildDir, etc.)
 */
export type CLIConfig = CLIGraphQLOptions

/**
 * Define CLI configuration with type safety
 */
export function defineConfig(config: Partial<CLIConfig>): Partial<CLIConfig> {
  return config
}

/**
 * Default CLI configuration values
 */
export const DEFAULT_CLI_CONFIG: CLIConfig = {
  framework: 'graphql-yoga',
  rootDir: '.',
  buildDir: '.graphql',
  serverDir: 'server/graphql',
  clientDir: 'graphql',
  typesDir: '.graphql/types',
  ignore: ['**/node_modules/**', '**/dist/**'],
}
