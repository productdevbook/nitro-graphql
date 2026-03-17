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
 * Default SDK configuration
 */
export const DEFAULT_SDK_CONFIG = {
  enabled: true,
  main: true,
  external: true,
} as const

/**
 * Default TypeScript strict mode setting
 */
export const DEFAULT_TYPESCRIPT_STRICT = true as const
