/**
 * Default configuration values for nitro-graphql module
 * Centralizing defaults makes them easier to find and modify
 */

import type { NitroGraphQLOptions } from './types'
import {
  DEFAULT_CLIENT_TYPES_PATH,
  DEFAULT_SERVER_TYPES_PATH,
  ENDPOINT_GRAPHQL,
  ENDPOINT_HEALTH,
} from '../core/constants'

/**
 * Default type generation configuration
 */
export const DEFAULT_TYPES_CONFIG = {
  server: DEFAULT_SERVER_TYPES_PATH,
  client: DEFAULT_CLIENT_TYPES_PATH,
  enabled: true,
} as const

/**
 * Default runtime GraphQL configuration
 */
export const DEFAULT_RUNTIME_CONFIG: NitroGraphQLOptions = {
  endpoint: {
    graphql: ENDPOINT_GRAPHQL,
    healthCheck: ENDPOINT_HEALTH,
  },
  playground: true,
}

/**
 * Default ignore patterns for file watching
 */
export const DEFAULT_IGNORE_PATTERNS: string[] = [
  // Auto-generated files are ignored by default
  // buildDir is already ignored by Nitro
]

/**
 * Default SDK configuration
 */
export const DEFAULT_SDK_CONFIG = {
  enabled: true,
  main: true,
  external: true,
} as const

/**
 * Default paths configuration
 * These are used as placeholders and resolved based on framework
 */
export const DEFAULT_PATHS_CONFIG = {
  serverGraphql: 'server/graphql',
  clientGraphql: null, // Determined by framework: 'app/graphql' for Nuxt, 'graphql' for Nitro
  buildDir: null, // Determined by framework: '.nuxt' or '.nitro'
  typesDir: null, // Derived from buildDir: '{buildDir}/types'
} as const

/**
 * Default TypeScript strict mode setting
 */
export const DEFAULT_TYPESCRIPT_STRICT = true as const

/**
 * Default watcher persistence setting
 */
export const DEFAULT_WATCHER_PERSISTENT = true as const

/**
 * Default watcher ignore initial setting
 */
export const DEFAULT_WATCHER_IGNORE_INITIAL = true as const
