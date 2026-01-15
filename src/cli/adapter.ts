/**
 * CLI Framework Adapter
 *
 * Implements the FrameworkAdapter interface for standalone CLI usage.
 * Converts CLI context to core types for shared functionality.
 */

import type { CoreCodegenConfig, CoreConfig, CoreContext, CoreLogger, ScanContext } from '../core/types'
import type { FrameworkAdapter } from '../core/types/adapter'
import type { CLIContext } from './index'
import consola from 'consola'
import { createCoreConfig, createCoreContext, createScanContext } from '../core/config'
import { LOG_TAG } from '../core/constants'

/**
 * Create a CoreLogger from consola for CLI usage
 */
function createCLILogger(): CoreLogger {
  const logger = consola.withTag(LOG_TAG)
  return {
    info: (...args) => logger.info(...args),
    warn: (...args) => logger.warn(...args),
    error: (...args) => logger.error(...args),
    debug: (...args) => logger.debug(...args),
    success: (...args) => logger.success(...args),
  }
}

/**
 * CLI Framework Adapter
 *
 * Enables the CLI to use the same core functions as the Nitro module.
 * The adapter converts CLIContext to the types expected by core functions.
 */
export const CLIAdapter: FrameworkAdapter<CLIContext> = {
  name: 'cli',

  createCoreConfig: (ctx: CLIContext): CoreConfig => {
    return createCoreConfig({
      rootDir: ctx.config.rootDir,
      buildDir: ctx.config.buildDir,
      serverDir: ctx.config.serverDir,
      clientDir: ctx.config.clientDir,
      isNuxt: false,
      isDev: true,
      graphqlOptions: {
        framework: ctx.config.framework,
        endpoint: ctx.config.endpoint?.graphql,
        security: ctx.config.security,
        federation: ctx.config.federation,
        externalServices: ctx.config.externalServices?.map(s => ({
          name: s.name,
          endpoint: s.endpoint,
          schema: (Array.isArray(s.schema) ? s.schema[0] : s.schema) || s.endpoint,
          headers: s.headers,
          documents: s.documents,
          paths: s.paths
            ? {
                sdk: typeof s.paths.sdk === 'string' ? s.paths.sdk : undefined,
                types: typeof s.paths.types === 'string' ? s.paths.types : undefined,
              }
            : undefined,
        })),
        codegen: ctx.config.codegen as CoreCodegenConfig,
      },
      logger: createCLILogger(),
      ignorePatterns: ctx.config.ignore || [],
    })
  },

  createCoreContext: (ctx: CLIContext): CoreContext => {
    const config = CLIAdapter.createCoreConfig(ctx)
    return createCoreContext(config)
  },

  createScanContext: (ctx: CLIContext): ScanContext => {
    const config = CLIAdapter.createCoreConfig(ctx)
    return createScanContext(config)
  },

  getLogger: (): CoreLogger => {
    return createCLILogger()
  },
}
