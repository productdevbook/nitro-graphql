/**
 * CLI Server Loader
 *
 * Loads schemas, resolvers, and directives from the file system
 * for use with the standalone CLI dev server.
 * Supports extend config for loading from packages.
 */

import type { ExtendScanResult } from '../../core/extend'
import type { DirectiveWrapper, ResolverDefinition, SchemaDefinition } from '../../core/schema/builder'
import type { ScannedResolver } from '../../core/types/scanning'
import type { CLIContext } from '../index'
import consola from 'consola'
import { scanAllExtendSources } from '../../core/extend'
import { scanDirectivesCore, scanResolversCore, scanSchemasCore } from '../../core/scanning'
import { pathToFileURL, readFileSync_ } from '../../core/utils/runtime'
import { CLIAdapter } from '../adapter'

const logger = consola.withTag('nitro-graphql')

// Cache extend result to avoid scanning multiple times
let cachedExtendResult: ExtendScanResult | null = null

/**
 * Get extend scan result (cached)
 */
async function getExtendResult(ctx: CLIContext): Promise<ExtendScanResult> {
  if (!cachedExtendResult) {
    cachedExtendResult = await scanAllExtendSources(
      ctx.config.extend as any,
      ctx.config.rootDir,
    )
  }
  return cachedExtendResult
}

/**
 * Clear extend cache (for hot reload)
 */
export function clearExtendCache(): void {
  cachedExtendResult = null
}

/**
 * Load schema definitions from GraphQL files
 * Includes schemas from extend sources
 */
export async function loadSchemaDefinitions(ctx: CLIContext): Promise<SchemaDefinition[]> {
  const scanCtx = CLIAdapter.createScanContext(ctx)
  const result = await scanSchemasCore(scanCtx)
  const extendResult = await getExtendResult(ctx)

  const allSchemas = [...result.items, ...extendResult.schemas]

  if (allSchemas.length === 0) {
    logger.warn('No GraphQL schema files found')
    return []
  }

  logger.debug(`Found ${allSchemas.length} schema file(s)`)

  return allSchemas.map(schemaPath => ({
    def: readFileSync_(schemaPath),
  }))
}

/**
 * Load resolver from a scanned item
 */
async function loadResolverFromItem(item: ScannedResolver): Promise<ResolverDefinition[]> {
  const filePath = item.specifier
  if (!filePath) {
    logger.warn('Resolver item has no specifier, skipping')
    return []
  }

  const resolvers: ResolverDefinition[] = []

  try {
    const fileUrl = pathToFileURL(filePath).href
    const moduleUrl = `${fileUrl}?t=${Date.now()}`
    const module = await import(moduleUrl)

    for (const imp of item.imports) {
      const exported = module[imp.name]
      if (exported && typeof exported === 'object') {
        resolvers.push({ resolver: exported })
        logger.debug(`Loaded resolver: ${imp.name} from ${filePath}`)
      }
    }
  }
  catch (error) {
    logger.error(`Failed to load resolver from ${filePath}:`, error)
  }

  return resolvers
}

/**
 * Load resolver definitions by dynamically importing resolver modules
 * Includes resolvers from extend sources
 */
export async function loadResolverDefinitions(ctx: CLIContext): Promise<ResolverDefinition[]> {
  const scanCtx = CLIAdapter.createScanContext(ctx)
  const result = await scanResolversCore(scanCtx)
  const extendResult = await getExtendResult(ctx)

  const allItems = [...result.items, ...extendResult.resolvers]

  if (allItems.length === 0) {
    logger.warn('No resolver files found')
    return []
  }

  logger.debug(`Found ${allItems.length} resolver file(s)`)

  const resolvers: ResolverDefinition[] = []
  for (const item of allItems) {
    const loaded = await loadResolverFromItem(item)
    resolvers.push(...loaded)
  }

  return resolvers
}

/**
 * Load directive from a scanned item
 */
async function loadDirectiveFromItem(item: ScannedResolver): Promise<DirectiveWrapper[]> {
  const filePath = item.specifier
  if (!filePath) {
    logger.warn('Directive item has no specifier, skipping')
    return []
  }

  const directives: DirectiveWrapper[] = []

  try {
    const fileUrl = pathToFileURL(filePath).href
    const moduleUrl = `${fileUrl}?t=${Date.now()}`
    const module = await import(moduleUrl)

    for (const imp of item.imports) {
      const exported = module[imp.name]
      if (exported && typeof exported === 'object') {
        directives.push({ directive: exported })
        logger.debug(`Loaded directive: ${imp.name} from ${filePath}`)
      }
    }
  }
  catch (error) {
    logger.error(`Failed to load directive from ${filePath}:`, error)
  }

  return directives
}

/**
 * Load directive definitions by dynamically importing directive modules
 * Includes directives from extend sources
 */
export async function loadDirectiveDefinitions(ctx: CLIContext): Promise<DirectiveWrapper[]> {
  const scanCtx = CLIAdapter.createScanContext(ctx)
  const result = await scanDirectivesCore(scanCtx)
  const extendResult = await getExtendResult(ctx)

  const allItems = [...result.items, ...extendResult.directives]

  if (allItems.length === 0) {
    logger.debug('No directive files found')
    return []
  }

  logger.debug(`Found ${allItems.length} directive file(s)`)

  const directives: DirectiveWrapper[] = []
  for (const item of allItems) {
    const loaded = await loadDirectiveFromItem(item)
    directives.push(...loaded)
  }

  return directives
}

/**
 * Load all GraphQL components (schemas, resolvers, directives)
 */
export async function loadAllComponents(ctx: CLIContext) {
  // Clear cache before loading all components (for hot reload)
  clearExtendCache()

  const [schemas, resolvers, directives] = await Promise.all([
    loadSchemaDefinitions(ctx),
    loadResolverDefinitions(ctx),
    loadDirectiveDefinitions(ctx),
  ])

  return { schemas, resolvers, directives }
}
