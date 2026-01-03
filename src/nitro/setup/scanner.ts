/**
 * GraphQL Scanner Module
 * Consolidated scanning logic for schemas, resolvers, directives, and documents
 */

import type { Nitro } from 'nitro/types'
import consola from 'consola'
import { LOG_TAG } from '../../core/constants'
import { generateDirectiveSchemas } from '../../core/utils/directive-parser'
import { NitroAdapter } from '../adapter'
import { resolveExtendConfig } from './extend-loader'

const logger = consola.withTag(LOG_TAG)

// ============ TYPES ============

export interface ScanOptions {
  /** Silent mode - suppress logging */
  silent?: boolean
  /** Is this a rescan (dev mode hot reload) */
  isRescan?: boolean
}

export interface ScanResult {
  schemas: number
  resolvers: number
  directives: number
  documents: number
}

// ============ HELPERS ============

/**
 * Check if local file scanning should be performed
 * Centralized helper to avoid scattered skipLocalScan checks
 */
export function shouldScanLocalFiles(nitro: Nitro): boolean {
  return nitro.options.graphql?.skipLocalScan !== true
}

/**
 * Check if server-side GraphQL is enabled
 */
export function isServerEnabled(nitro: Nitro): boolean {
  return nitro.options.graphql?.server !== false
}

/**
 * Get extend sources from config
 */
export function getExtendSources(nitro: Nitro): string[] | undefined {
  const extend = nitro.options.graphql?.extend
  return Array.isArray(extend) ? extend : undefined
}

// ============ CORE SCANNING ============

/**
 * Scan local GraphQL files (schemas, resolvers, directives, documents)
 * This is the low-level scan function - use performGraphQLScan for full workflow
 */
export async function scanLocalFiles(nitro: Nitro): Promise<ScanResult> {
  // Scan directives first
  const directivesResult = await NitroAdapter.scanDirectives(nitro)
  nitro.scanDirectives = directivesResult.items

  // Generate _directives.graphql file
  if (!nitro.scanSchemas)
    nitro.scanSchemas = []
  const directivesPath = await generateDirectiveSchemas(nitro, directivesResult.items)

  // Scan schemas
  const schemasResult = await NitroAdapter.scanSchemas(nitro)
  const schemas = schemasResult.items
  if (directivesPath && !schemas.includes(directivesPath))
    schemas.push(directivesPath)
  nitro.scanSchemas = schemas

  // Scan documents and resolvers
  const docsResult = await NitroAdapter.scanDocuments(nitro)
  nitro.scanDocuments = docsResult.items

  const resolversResult = await NitroAdapter.scanResolvers(nitro)
  nitro.scanResolvers = resolversResult.items

  return {
    schemas: schemas.length,
    resolvers: resolversResult.items.length,
    directives: directivesResult.items.length,
    documents: docsResult.items.length,
  }
}

/**
 * Scan only client documents (for external services or client-only mode)
 */
export async function scanDocumentsOnly(nitro: Nitro): Promise<number> {
  const result = await NitroAdapter.scanDocuments(nitro)
  nitro.scanDocuments = result.items
  return result.items.length
}

/**
 * Initialize empty scan results (for skipLocalScan mode)
 */
export function initializeEmptyScanResults(nitro: Nitro): void {
  nitro.scanSchemas = []
  nitro.scanResolvers = []
  nitro.scanDirectives = []
}

// ============ MAIN SCAN WORKFLOW ============

/**
 * Perform complete GraphQL scan workflow
 * This is the main entry point for both initial setup and dev mode rescan
 *
 * Workflow:
 * 1. Check skipLocalScan flag
 * 2. Scan local files if enabled
 * 3. Resolve extend config (append to results)
 * 4. Log diagnostics if needed
 */
export async function performGraphQLScan(nitro: Nitro, options: ScanOptions = {}): Promise<void> {
  const { silent = false, isRescan = false } = options
  const serverEnabled = isServerEnabled(nitro)
  const scanLocal = shouldScanLocalFiles(nitro)
  const extendSources = getExtendSources(nitro)

  // Step 1: Handle skipLocalScan mode
  if (!scanLocal) {
    if (!isRescan && !silent) {
      if (extendSources?.length) {
        logger.info(`Using ${extendSources.length} extend source(s), skipping local scanning`)
      }
      else {
        logger.info('Skipping local scanning (skipLocalScan: true)')
      }
    }

    // Initialize empty arrays for server-side scanning
    initializeEmptyScanResults(nitro)

    // Still scan documents for client-side usage (external services, etc.)
    await scanDocumentsOnly(nitro)
  }
  // Step 2: Perform local file scanning
  else if (serverEnabled) {
    await scanLocalFiles(nitro)
  }
  else {
    // Client-only mode: only scan documents
    await scanDocumentsOnly(nitro)
  }

  // Step 3: Resolve extend config (always, to append manifest files)
  await resolveExtendConfig(nitro, { silent: silent || isRescan })
}

// ============ DIAGNOSTICS ============

/**
 * Log resolver diagnostics for development
 */
export function logResolverDiagnostics(nitro: Nitro): void {
  const resolvers = nitro.scanResolvers || []

  if (resolvers.length > 0) {
    const totalExports = resolvers.reduce((sum, r) => sum + r.imports.length, 0)

    // Show breakdown by type for better visibility
    const typeCount = {
      query: 0,
      mutation: 0,
      resolver: 0,
      type: 0,
      subscription: 0,
      directive: 0,
    }
    for (const resolver of resolvers) {
      for (const imp of resolver.imports) {
        if (imp.type in typeCount) {
          typeCount[imp.type as keyof typeof typeCount]++
        }
      }
    }

    const breakdown: string[] = []
    if (typeCount.query > 0)
      breakdown.push(`${typeCount.query} query`)
    if (typeCount.mutation > 0)
      breakdown.push(`${typeCount.mutation} mutation`)
    if (typeCount.resolver > 0)
      breakdown.push(`${typeCount.resolver} resolver`)
    if (typeCount.type > 0)
      breakdown.push(`${typeCount.type} type`)
    if (typeCount.subscription > 0)
      breakdown.push(`${typeCount.subscription} subscription`)
    if (typeCount.directive > 0)
      breakdown.push(`${typeCount.directive} directive`)

    if (breakdown.length > 0) {
      logger.success(`${totalExports} resolver export(s): ${breakdown.join(', ')}`)
    }
  }
  else {
    logger.warn('No resolvers found. Check /_nitro/graphql/debug for details.')
  }
}
