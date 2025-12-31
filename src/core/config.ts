/**
 * Core configuration utilities
 * Factory functions and helpers for creating CoreConfig
 */

import type { CoreConfig, CoreContext, CoreGraphQLOptions, CoreLogger } from './types/config'
import type { ScanContext } from './types/scanning'
import { relative, resolve } from 'pathe'
import {
  DIR_APP_GRAPHQL,
  DIR_BUILD_NITRO,
  DIR_CLIENT_GRAPHQL,
  DIR_SERVER_GRAPHQL,
  GRAPHQL_FRAMEWORK_YOGA,
} from './constants'
import { createLogger } from './utils/logger'

/**
 * Options for creating a CoreConfig
 */
export interface CreateCoreConfigOptions {
  /** Root directory of the project */
  rootDir: string
  /** Build directory (optional, defaults based on framework) */
  buildDir?: string
  /** Server GraphQL directory (optional) */
  serverDir?: string
  /** Client GraphQL directory (optional) */
  clientDir?: string
  /** Whether running in Nuxt context */
  isNuxt?: boolean
  /** Whether running in development mode */
  isDev?: boolean
  /** GraphQL options */
  graphqlOptions?: CoreGraphQLOptions
  /** Custom logger */
  logger?: CoreLogger
  /** Patterns to ignore */
  ignorePatterns?: string[]
  /** Layer server directories */
  layerServerDirs?: string[]
  /** Layer app directories */
  layerAppDirs?: string[]
}

/**
 * Create a CoreConfig with sensible defaults
 */
export function createCoreConfig(options: CreateCoreConfigOptions): CoreConfig {
  const {
    rootDir,
    isNuxt = false,
    isDev = process.env.NODE_ENV !== 'production',
    graphqlOptions = {},
    logger = createLogger(),
    ignorePatterns = [],
    layerServerDirs = [],
    layerAppDirs = [],
  } = options

  // Determine framework
  const framework = graphqlOptions.framework || GRAPHQL_FRAMEWORK_YOGA

  // Resolve directories
  const buildDir = options.buildDir || resolve(rootDir, isNuxt ? '.nuxt' : DIR_BUILD_NITRO)
  const serverDir = options.serverDir || resolve(rootDir, DIR_SERVER_GRAPHQL)
  const clientDir = options.clientDir || resolve(rootDir, isNuxt ? DIR_APP_GRAPHQL : DIR_CLIENT_GRAPHQL)
  const typesDir = resolve(buildDir, 'types')

  return {
    rootDir,
    buildDir,
    serverDir,
    clientDir,
    typesDir,
    framework,
    isNuxt,
    isDev,
    graphqlOptions,
    logger,
    ignorePatterns,
    layerServerDirs,
    layerAppDirs,
  }
}

/**
 * Create a CoreContext from CoreConfig
 */
export function createCoreContext(config: CoreConfig): CoreContext {
  const graphqlBuildDir = resolve(config.buildDir, 'graphql')

  // Calculate relative directory paths
  const dir = {
    build: relative(config.rootDir, config.buildDir),
    client: relative(config.rootDir, config.clientDir),
    server: relative(config.rootDir, config.serverDir),
  }

  return {
    config,
    graphqlBuildDir,
    watchDirs: [],
    dir,
  }
}

/**
 * Create a ScanContext from CoreConfig
 */
export function createScanContext(config: CoreConfig): ScanContext {
  return {
    rootDir: config.rootDir,
    serverDir: config.serverDir,
    clientDir: config.clientDir,
    ignorePatterns: config.ignorePatterns,
    isDev: config.isDev,
    logger: config.logger,
    layerServerDirs: config.layerServerDirs,
    layerAppDirs: config.layerAppDirs,
  }
}

/**
 * Merge GraphQL options with defaults
 */
export function mergeGraphQLOptions(
  options: Partial<CoreGraphQLOptions>,
  defaults: Partial<CoreGraphQLOptions> = {},
): CoreGraphQLOptions {
  return {
    ...defaults,
    ...options,
    codegen: {
      ...defaults.codegen,
      ...options.codegen,
    },
    security: {
      ...defaults.security,
      ...options.security,
    },
    paths: {
      ...defaults.paths,
      ...options.paths,
    },
  }
}
