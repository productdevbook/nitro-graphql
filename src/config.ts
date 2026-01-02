/**
 * Configuration utilities for nitro-graphql
 * This is a standalone module without side effects
 * Safe to import from config files
 */

// Re-export from cli/config without side effects
export { DEFAULT_CLI_CONFIG, defineConfig } from './cli/config'
export type { CLIConfig } from './cli/config'
