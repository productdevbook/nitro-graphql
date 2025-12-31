/**
 * Framework adapter types
 * Defines the interface for framework-specific adapters
 */

import type { CoreConfig, CoreContext, CoreLogger, ScanContext, ScannedResolver, ScanResult } from './index'

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

/**
 * Scan adapter interface
 * Provides high-level scanning operations using the framework adapter
 */
export interface ScanAdapter<TFramework = unknown> {
  /** Scan for GraphQL schema files */
  scanSchemas: (framework: TFramework) => Promise<ScanResult<string>>

  /** Scan for GraphQL files (schemas + operations) */
  scanGraphql: (framework: TFramework) => Promise<ScanResult<string>>

  /** Scan for resolver files */
  scanResolvers: (framework: TFramework) => Promise<ScanResult<ScannedResolver>>

  /** Scan for directive files */
  scanDirectives: (framework: TFramework) => Promise<ScanResult<ScannedResolver>>

  /** Scan for client documents */
  scanDocuments: (framework: TFramework) => Promise<ScanResult<string>>
}

/**
 * Codegen adapter interface
 * Provides high-level codegen operations using the framework adapter
 */
export interface CodegenAdapter<TFramework = unknown> {
  /** Generate server types */
  generateServerTypes: (framework: TFramework, options?: { silent?: boolean }) => Promise<void>

  /** Generate client types */
  generateClientTypes: (framework: TFramework, options?: { silent?: boolean }) => Promise<void>
}

/**
 * Combined full adapter interface
 */
export interface FullFrameworkAdapter<TFramework = unknown>
  extends FrameworkAdapter<TFramework>,
  ScanAdapter<TFramework>,
  CodegenAdapter<TFramework> {}
