/**
 * CLI Configuration
 * Standalone config file format for nitro-graphql CLI
 */

import type { NitroGraphQLOptions } from '../nitro/types'

/**
 * CLI configuration options
 * Now unified with NitroGraphQLOptions - all options available in both CLI and module context
 */
export type CLIConfig = NitroGraphQLOptions

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
