/**
 * Logger utilities
 * Provides framework-agnostic logging functionality
 */

import type { CoreLogger } from '../types/config'
import { consola } from 'consola'
import { LOG_TAG } from '../constants'

/**
 * Create a logger instance with the nitro-graphql tag
 */
export function createLogger(tag: string = LOG_TAG): CoreLogger {
  const logger = consola.withTag(tag)

  return {
    info: (message: string, ...args: unknown[]) => logger.info(message, ...args),
    warn: (message: string, ...args: unknown[]) => logger.warn(message, ...args),
    error: (message: string, ...args: unknown[]) => logger.error(message, ...args),
    success: (message: string, ...args: unknown[]) => logger.success(message, ...args),
    debug: (message: string, ...args: unknown[]) => logger.debug(message, ...args),
  }
}

/**
 * Default logger instance
 */
export const defaultLogger = createLogger()

/**
 * Create a silent logger (no output)
 * Useful for testing or when logging should be suppressed
 */
export function createSilentLogger(): CoreLogger {
  const noop = () => {}
  return {
    info: noop,
    warn: noop,
    error: noop,
    success: noop,
    debug: noop,
  }
}
