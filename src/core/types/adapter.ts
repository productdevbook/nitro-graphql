/**
 * Framework adapter types
 * Defines the interface for framework-specific adapters
 */

import type { CoreConfig, CoreContext, CoreLogger, ScanContext } from './index'

/**
 * Framework adapter interface
 * Adapters convert framework-specific types to core types
 */
export interface FrameworkAdapter<TFramework = unknown> {
  /** Adapter name for logging */
  readonly name: string

  /** Create core config from framework instance */
  createCoreConfig: (framework: TFramework) => CoreConfig

  /** Create core context from framework instance */
  createCoreContext: (framework: TFramework) => CoreContext

  /** Create scan context from framework instance */
  createScanContext: (framework: TFramework) => ScanContext

  /** Get framework logger adapted to CoreLogger interface */
  getLogger: (framework: TFramework) => CoreLogger
}
