/**
 * CLI Framework Adapter
 * Converts CLI context to core types for shared functionality
 */

import type { FrameworkAdapter } from '../core/types/adapter'
import type { CoreConfig, CoreLogger } from '../core/types/config'
import type { ScanContext } from '../core/types/scanning'
import type { CLIContext } from './index'
import consola from 'consola'
import { LOG_TAG } from '../core/constants'
import { createCoreConfig, createScanContext } from '../core/create-config'

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
      logger: createCLILogger(),
      ignorePatterns: ctx.config.ignore || [],
      security: ctx.config.security,
      federation: ctx.config.federation,
      codegen: ctx.config.codegen,
      externalServices: ctx.config.externalServices,
    })
  },

  createScanContext: (ctx: CLIContext): ScanContext => {
    const config = CLIAdapter.createCoreConfig(ctx)
    return createScanContext(config)
  },

  getLogger: (): CoreLogger => {
    return createCLILogger()
  },
}
