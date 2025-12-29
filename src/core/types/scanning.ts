/**
 * Scanning types
 * Framework-agnostic types for file scanning operations
 */

import type { CoreLogger } from './config'

/**
 * Scan context for file scanning operations
 * Provides all necessary information for scanning without framework dependencies
 */
export interface ScanContext {
  /** Root directory of the project */
  rootDir: string
  /** Server GraphQL directory */
  serverDir: string
  /** Client GraphQL directory */
  clientDir: string
  /** Patterns to ignore during scanning */
  ignorePatterns: string[]
  /** Whether running in development mode */
  isDev: boolean
  /** Logger instance */
  logger: CoreLogger
  /** Layer server directories (Nuxt layers) */
  layerServerDirs?: string[]
  /** Layer app directories (Nuxt layers) */
  layerAppDirs?: string[]
}

/**
 * Generic scan result wrapper
 * Provides consistent result structure with warnings and errors
 */
export interface ScanResult<T> {
  /** Scanned items */
  items: T[]
  /** Non-fatal warnings encountered during scanning */
  warnings: string[]
  /** Errors encountered during scanning */
  errors: string[]
}

/**
 * File information from scanning
 */
export interface ScannedFile {
  /** Relative path from scan directory */
  path: string
  /** Absolute file path */
  fullPath: string
}

/**
 * Resolver import information
 */
export interface ResolverImport {
  /** Export name */
  name: string
  /** Resolver type (query, mutation, resolver, type, subscription, directive) */
  type: 'query' | 'mutation' | 'resolver' | 'type' | 'subscription' | 'directive'
  /** Aliased import name */
  as: string
}

/**
 * Scanned resolver information
 */
export interface ScannedResolver {
  /** File specifier (path) */
  specifier: string
  /** Exports from this file */
  imports: ResolverImport[]
}

/**
 * Scanned directive information
 */
export interface ScannedDirective {
  /** Absolute file path */
  fullPath: string
  /** Relative path */
  path: string
}

/**
 * Scanned document (client GraphQL operation)
 */
export interface ScannedDocument {
  /** Absolute file path */
  fullPath: string
  /** Document content */
  content?: string
}

/**
 * Complete scan results
 */
export interface AllScanResults {
  /** Schema file paths */
  schemas: string[]
  /** Resolver information */
  resolvers: ScannedResolver[]
  /** Directive files */
  directives: ScannedDirective[]
  /** Client document files */
  documents: string[]
}
