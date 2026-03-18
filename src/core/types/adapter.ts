/**
 * Framework adapter types
 * Defines the interface for framework-specific adapters
 */

import type { CoreConfig, CoreLogger } from './config'
import type { ScanContext } from './scanning'

/**
 * Framework adapter interface
 * Adapters convert framework-specific types to core types
 */
export interface FrameworkAdapter<TFramework = unknown> {
  /** Adapter name for logging */
  readonly name: string

  /** Create core config from framework instance */
  createCoreConfig: (framework: TFramework) => CoreConfig

  /** Create scan context from framework instance */
  createScanContext: (framework: TFramework) => ScanContext

  /** Get framework logger adapted to CoreLogger interface */
  getLogger: (framework: TFramework) => CoreLogger
}
