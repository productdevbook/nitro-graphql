/**
 * Nitro framework adapter
 * Converts Nitro types to core types
 */

import type { Nitro } from 'nitro/types'
import type { CoreConfig, CoreContext, CoreLogger, ScanContext, ScannedResolver, ScanResult } from '../core/types'
import type { FrameworkAdapter, ScanAdapter } from '../core/types/adapter'
import { join, relative } from 'pathe'
import {
  scanDirectivesCore,
  scanDocumentsCore,
  scanGraphqlCore,
  scanResolversCore,
  scanSchemasCore,
} from '../core/scanning'

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
 * Create a ScanContext from Nitro instance
 */
export function createScanContextFromNitro(nitro: Nitro): ScanContext {
  return {
    rootDir: nitro.options.rootDir,
    serverDir: nitro.graphql.serverDir,
    clientDir: nitro.graphql.clientDir,
    ignorePatterns: nitro.options.ignore,
    isDev: nitro.options.dev,
    logger: createLoggerFromNitro(nitro),
    layerServerDirs: nitro.options.graphql?.layerServerDirs || [],
    layerAppDirs: nitro.options.graphql?.layerAppDirs || [],
  }
}

/**
 * Create a CoreConfig from Nitro instance
 */
export function createCoreConfigFromNitro(nitro: Nitro): CoreConfig {
  const graphqlOptions = nitro.options.graphql || {}
  const isNuxt = nitro.options.framework?.name === 'nuxt'

  // Compute typesDir from buildDir
  const typesDir = join(nitro.graphql.buildDir, 'types')

  return {
    rootDir: nitro.options.rootDir,
    buildDir: nitro.graphql.buildDir,
    serverDir: nitro.graphql.serverDir,
    clientDir: nitro.graphql.clientDir,
    typesDir,
    framework: graphqlOptions.framework || 'graphql-yoga',
    isNuxt,
    isDev: nitro.options.dev,
    graphqlOptions: {
      framework: graphqlOptions.framework,
      endpoint: typeof graphqlOptions.endpoint === 'object'
        ? graphqlOptions.endpoint?.graphql
        : graphqlOptions.endpoint,
      federation: graphqlOptions.federation,
      security: graphqlOptions.security,
    },
    logger: createLoggerFromNitro(nitro),
    ignorePatterns: nitro.options.ignore,
    layerServerDirs: nitro.options.graphql?.layerServerDirs || [],
    layerAppDirs: nitro.options.graphql?.layerAppDirs || [],
  }
}

/**
 * Create a CoreContext from Nitro instance
 */
export function createCoreContextFromNitro(nitro: Nitro): CoreContext {
  const config = createCoreConfigFromNitro(nitro)

  return {
    config,
    graphqlBuildDir: nitro.graphql.buildDir,
    watchDirs: nitro.graphql.watchDirs,
    dir: nitro.graphql.dir,
  }
}

/**
 * Nitro framework adapter implementation
 */
export const NitroAdapter: FrameworkAdapter<Nitro> & ScanAdapter<Nitro> = {
  name: 'nitro',

  createCoreConfig: createCoreConfigFromNitro,
  createCoreContext: createCoreContextFromNitro,
  createScanContext: createScanContextFromNitro,
  getLogger: createLoggerFromNitro,

  scanSchemas: (nitro: Nitro) => scanSchemasCore(createScanContextFromNitro(nitro)),
  scanGraphql: (nitro: Nitro) => scanGraphqlCore(createScanContextFromNitro(nitro)),
  scanResolvers: (nitro: Nitro) => scanResolversCore(createScanContextFromNitro(nitro)),
  scanDirectives: (nitro: Nitro) => scanDirectivesCore(createScanContextFromNitro(nitro)),

  scanDocuments(nitro: Nitro): Promise<ScanResult<string>> {
    return scanDocumentsCore(createScanContextFromNitro(nitro), {
      externalServices: nitro.options.graphql?.externalServices as any,
      clientDirRelative: relative(nitro.options.rootDir, nitro.graphql.clientDir),
    })
  },
}

export default NitroAdapter
