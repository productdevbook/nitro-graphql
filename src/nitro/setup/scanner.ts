/**
 * GraphQL Scanner Module
 * Consolidated scanning logic — builds immutable GraphQLScanState snapshots
 */

import type { Nitro } from 'nitro/types'
import type { ScannedResolver } from '../../core/types/scanning'
import type { ExtendSource } from '../types'
import consola from 'consola'
import { relative } from 'pathe'
import { LOG_TAG } from '../../core/constants'
import {
  scanDirectivesCore,
  scanDocumentsCore,
  scanResolversCore,
  scanSchemasCore,
} from '../../core/scanning'
import { generateDirectiveSchemas } from '../../core/utils/directive-parser'
import { createScanContextFromNitro } from '../adapter'
import { createScanState } from '../state'
import { resolveExtendConfig } from './extend-loader'

const logger = consola.withTag(LOG_TAG)

// ============ TYPES ============

export interface ScanOptions {
  silent?: boolean
  isRescan?: boolean
}

// ============ HELPERS ============

export function shouldScanLocalFiles(nitro: Nitro): boolean {
  return nitro.options.graphql?.skipLocalScan !== true
}

export function isServerEnabled(nitro: Nitro): boolean {
  return nitro.options.graphql?.server !== false
}

export function getExtendSources(nitro: Nitro): ExtendSource[] | undefined {
  const extend = nitro.options.graphql?.extend
  return Array.isArray(extend) ? extend : undefined
}

// ============ CORE SCANNING ============

/**
 * Scan local GraphQL files and return an immutable state snapshot.
 * Does NOT mutate nitro — caller is responsible for assigning the state.
 */
async function scanLocalFiles(nitro: Nitro) {
  const ctx = createScanContextFromNitro(nitro)

  // Scan directives first (needed for directive schema generation)
  const directivesResult = await scanDirectivesCore(ctx)
  const directiveSchemas = await generateDirectiveSchemas(directivesResult.items, nitro.graphql.buildDir)

  // Scan schemas
  const schemasResult = await scanSchemasCore(ctx)

  // Scan documents and resolvers in parallel
  const [docsResult, resolversResult] = await Promise.all([
    scanDocumentsCore(ctx, {
      externalServices: nitro.options.graphql?.externalServices,
      clientDirRelative: relative(nitro.options.rootDir, nitro.graphql.clientDir),
    }),
    scanResolversCore(ctx),
  ])

  return createScanState({
    schemas: schemasResult.items,
    resolvers: resolversResult.items,
    directives: directivesResult.items,
    documents: docsResult.items,
    directiveSchemas,
  })
}

/**
 * Scan only client documents, preserving existing state for other fields
 */
async function scanDocumentsOnly(nitro: Nitro) {
  const ctx = createScanContextFromNitro(nitro)
  const result = await scanDocumentsCore(ctx, {
    externalServices: nitro.options.graphql?.externalServices,
    clientDirRelative: relative(nitro.options.rootDir, nitro.graphql.clientDir),
  })

  return createScanState({
    schemas: [],
    resolvers: [],
    directives: [],
    documents: result.items,
    directiveSchemas: null,
  })
}

// ============ MAIN SCAN WORKFLOW ============

/**
 * Perform complete GraphQL scan workflow.
 * Builds an immutable state snapshot and assigns it to nitro.graphql.state atomically.
 *
 * Flow:
 * 1. Scan local files (or skip if skipLocalScan)
 * 2. Merge extend sources into state
 * 3. Assign frozen state to nitro.graphql.state (single atomic write)
 */
export async function performGraphQLScan(nitro: Nitro, options: ScanOptions = {}): Promise<void> {
  const { silent = false, isRescan = false } = options
  const serverEnabled = isServerEnabled(nitro)
  const scanLocal = shouldScanLocalFiles(nitro)
  const extendSources = getExtendSources(nitro)

  // Skip rescan when extend sources exist — extend packages don't change during dev,
  // and the eager virtual module snapshots already captured the initial state
  if (isRescan && extendSources?.length) {
    return
  }

  let state

  // Step 1: Build initial state from local scan
  if (!scanLocal) {
    if (!isRescan && !silent) {
      if (extendSources?.length) {
        logger.info(`Using ${extendSources.length} extend source(s), skipping local scanning`)
      }
      else {
        logger.info('Skipping local scanning (skipLocalScan: true)')
      }
    }
    state = await scanDocumentsOnly(nitro)
  }
  else if (serverEnabled) {
    state = await scanLocalFiles(nitro)
  }
  else {
    state = await scanDocumentsOnly(nitro)
  }

  // Step 2: Merge extend sources (mutates state via mergeScanState which returns new frozen object)
  state = await resolveExtendConfig(nitro, state, { silent: silent || isRescan })

  // Step 3: Atomic state assignment — single write, no partial state possible
  nitro.graphql.state = state

  // Sync legacy fields for backward compatibility (tests, external consumers)
  nitro.scanSchemas = [...state.schemas] as string[]
  nitro.scanResolvers = [...state.resolvers] as ScannedResolver[]
  nitro.scanDirectives = [...state.directives] as ScannedResolver[]
  nitro.scanDocuments = [...state.documents] as string[]
  nitro.graphql.directiveSchemas = state.directiveSchemas
  nitro.graphql.extendConfigs = [...state.extendConfigs] as string[]
  nitro.graphql.extendSchemas = [...state.extendSchemas] as string[]
}

// ============ DIAGNOSTICS ============

export function logResolverDiagnostics(nitro: Nitro): void {
  const resolvers = nitro.graphql.state.resolvers

  if (resolvers.length > 0) {
    const totalExports = resolvers.reduce((sum, r) => sum + r.imports.length, 0)

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
