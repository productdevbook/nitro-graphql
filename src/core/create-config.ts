/**
 * Core configuration utilities
 * Factory functions for creating CoreConfig and ScanContext
 */

import type { CoreConfig, CoreLogger } from './types/config'
import type { ScanContext } from './types/scanning'
import { resolve } from 'pathe'
import {
  DIR_APP_GRAPHQL,
  DIR_CLIENT_GRAPHQL,
  DIR_SERVER_GRAPHQL,
  GRAPHQL_FRAMEWORK_YOGA,
} from './constants'
import { createLogger } from './utils/logger'

/**
 * Options for creating a CoreConfig
 */
export interface CreateCoreConfigOptions {
  rootDir: string
  buildDir?: string
  serverDir?: string
  clientDir?: string
  isNuxt?: boolean
  isDev?: boolean
  logger?: CoreLogger
  ignorePatterns?: string[]
  security?: CoreConfig['security']
  federation?: CoreConfig['federation']
  codegen?: CoreConfig['codegen']
  externalServices?: CoreConfig['externalServices']
}

/**
 * Create a CoreConfig with sensible defaults
 */
export function createCoreConfig(options: CreateCoreConfigOptions): CoreConfig {
  const {
    rootDir,
    isNuxt = false,
    isDev = process.env.NODE_ENV !== 'production',
    logger = createLogger(),
    ignorePatterns = [],
    security,
    federation,
    codegen,
    externalServices,
  } = options

  const buildDir = options.buildDir || resolve(rootDir, isNuxt ? '.nuxt' : '.nitro')
  const serverDir = options.serverDir || resolve(rootDir, DIR_SERVER_GRAPHQL)
  const clientDir = options.clientDir || resolve(rootDir, isNuxt ? DIR_APP_GRAPHQL : DIR_CLIENT_GRAPHQL)
  const typesDir = resolve(buildDir, 'types')

  return {
    rootDir,
    buildDir,
    serverDir,
    clientDir,
    typesDir,
    framework: GRAPHQL_FRAMEWORK_YOGA,
    isNuxt,
    isDev,
    logger,
    ignorePatterns,
    security,
    federation,
    codegen,
    externalServices,
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
  }
}
