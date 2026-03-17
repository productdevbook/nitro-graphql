/**
 * Nitro framework adapter
 * Converts Nitro types to core types for shared functionality
 */

import type { Nitro } from 'nitro/types'
import type { CoreConfig, CoreLogger } from '../core/types/config'
import type { ScanContext } from '../core/types/scanning'
import type { FrameworkAdapter } from '../core/types/adapter'
import { join } from 'pathe'

/**
 * Create a CoreLogger from Nitro's logger
 */
export function createLoggerFromNitro(nitro: Nitro): CoreLogger {
  return {
    info: (msg, ...args) => nitro.logger.info(msg, ...args),
    warn: (msg, ...args) => nitro.logger.warn(msg, ...args),
    error: (msg, ...args) => nitro.logger.error(msg, ...args),
    success: (msg, ...args) => nitro.logger.success(msg, ...args),
    debug: (msg, ...args) => nitro.logger.debug(msg, ...args),
  }
}

/**
 * Create a ScanContext directly from Nitro instance
 */
export function createScanContextFromNitro(nitro: Nitro): ScanContext {
  return {
    rootDir: nitro.options.rootDir,
    serverDir: nitro.graphql.serverDir,
    clientDir: nitro.graphql.clientDir,
    ignorePatterns: nitro.options.ignore,
    isDev: nitro.options.dev,
    logger: createLoggerFromNitro(nitro),
  }
}

/**
 * Create a CoreConfig from Nitro instance
 */
export function createCoreConfigFromNitro(nitro: Nitro): CoreConfig {
  const graphqlOptions = nitro.options.graphql || {}

  return {
    rootDir: nitro.options.rootDir,
    buildDir: nitro.graphql.buildDir,
    serverDir: nitro.graphql.serverDir,
    clientDir: nitro.graphql.clientDir,
    typesDir: join(nitro.graphql.buildDir, 'types'),
    framework: graphqlOptions.framework || 'graphql-yoga',
    isNuxt: nitro.options.framework?.name === 'nuxt',
    isDev: nitro.options.dev,
    logger: createLoggerFromNitro(nitro),
    ignorePatterns: nitro.options.ignore,
    security: graphqlOptions.security,
    federation: graphqlOptions.federation,
    codegen: graphqlOptions.codegen,
    externalServices: graphqlOptions.externalServices,
  }
}

/**
 * Nitro framework adapter
 */
export const NitroAdapter: FrameworkAdapter<Nitro> = {
  name: 'nitro',
  createCoreConfig: createCoreConfigFromNitro,
  createScanContext: createScanContextFromNitro,
  getLogger: createLoggerFromNitro,
}

export default NitroAdapter
