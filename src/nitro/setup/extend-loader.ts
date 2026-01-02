/**
 * Extend configuration loader
 * Handles loading GraphQL manifests and resolving extend sources
 */

import type { Nitro } from 'nitro/types'
import consola from 'consola'
import { resolve } from 'pathe'
import {
  loadManifest,
  parseResolverCall,
  parseSingleFile,
  resolveManifestPaths,
} from '../../core'
import { LOG_TAG } from '../../core/constants'

const logger = consola.withTag(LOG_TAG)

interface ExtendResult {
  schemas: number
  resolvers: number
}

/**
 * Resolve extend configuration and add files to scan results
 * Must be called AFTER scanGraphQLFiles to append to results
 */
export async function resolveExtendConfig(nitro: Nitro): Promise<void> {
  const extend = nitro.options.graphql?.extend
  if (!extend || !Array.isArray(extend) || extend.length === 0) return

  let schemasAdded = 0
  let resolversAdded = 0

  for (const source of extend) {
    const result = await processExtendSource(source, nitro)
    schemasAdded += result.schemas
    resolversAdded += result.resolvers
  }

  if (schemasAdded > 0 || resolversAdded > 0) {
    logger.info(`Added ${schemasAdded} schema(s), ${resolversAdded} resolver file(s) from extend`)
  }
}

/**
 * Process a single extend source (package name, manifest path, or explicit config)
 */
async function processExtendSource(
  source: string | object,
  nitro: Nitro,
): Promise<ExtendResult> {
  if (typeof source === 'string') {
    return loadManifestFromPackage(source, nitro)
  }

  if (source && typeof source === 'object') {
    return processObjectSource(source as Record<string, unknown>, nitro)
  }

  return { schemas: 0, resolvers: 0 }
}

/**
 * Load manifest from package name
 */
async function loadManifestFromPackage(
  packageName: string,
  nitro: Nitro,
): Promise<ExtendResult> {
  const manifestResult = await loadManifest(packageName, nitro.options.rootDir)

  if (!manifestResult) {
    throw new Error(
      `[nitro-graphql] Manifest not found for "${packageName}". `
      + `Create a graphql-manifest.json file in the package root with schemas and resolvers paths.`,
    )
  }

  logger.info(`Loaded manifest from ${packageName}`)
  return addManifestFiles(manifestResult, nitro)
}

/**
 * Process object-style extend source
 */
async function processObjectSource(
  source: { manifest?: string, resolvers?: string | string[], schemas?: string | string[] },
  nitro: Nitro,
): Promise<ExtendResult> {
  if (source.manifest) {
    const manifestResult = await loadManifest(source.manifest, nitro.options.rootDir)
    if (!manifestResult) {
      throw new Error(`[nitro-graphql] Manifest not found at "${source.manifest}"`)
    }
    logger.info(`Loaded manifest from ${source.manifest}`)
    return addManifestFiles(manifestResult, nitro)
  }

  // Legacy: explicit paths
  return addExplicitPaths(source, nitro)
}

/**
 * Add files from a resolved manifest to scan results
 */
async function addManifestFiles(
  manifestResult: { manifest: { schemas?: string[], resolvers?: string[], directives?: string[] }, baseDir: string },
  nitro: Nitro,
): Promise<ExtendResult> {
  const paths = resolveManifestPaths(manifestResult.manifest, manifestResult.baseDir)
  let schemasAdded = 0
  let resolversAdded = 0

  // Add schemas
  for (const schemaPath of paths.schemas) {
    if (!nitro.scanSchemas.includes(schemaPath)) {
      nitro.scanSchemas.push(schemaPath)
      schemasAdded++
    }
  }

  // Parse and add resolvers
  for (const resolverPath of paths.resolvers) {
    const parsed = await parseSingleFile(resolverPath, parseResolverCall)
    if (parsed?.imports.length) {
      nitro.scanResolvers.push(parsed)
      resolversAdded++
    }
  }

  return { schemas: schemasAdded, resolvers: resolversAdded }
}

/**
 * Add explicit paths (legacy format)
 */
async function addExplicitPaths(
  source: { resolvers?: string | string[], schemas?: string | string[] },
  nitro: Nitro,
): Promise<ExtendResult> {
  let schemasAdded = 0
  let resolversAdded = 0

  if (source.schemas) {
    const schemas = Array.isArray(source.schemas) ? source.schemas : [source.schemas]
    for (const schemaPath of schemas) {
      const fullPath = resolve(nitro.options.rootDir, schemaPath)
      if (!nitro.scanSchemas.includes(fullPath)) {
        nitro.scanSchemas.push(fullPath)
        schemasAdded++
      }
    }
  }

  if (source.resolvers) {
    const resolvers = Array.isArray(source.resolvers) ? source.resolvers : [source.resolvers]
    for (const resolverPath of resolvers) {
      const fullPath = resolve(nitro.options.rootDir, resolverPath)
      const parsed = await parseSingleFile(fullPath, parseResolverCall)
      if (parsed?.imports.length) {
        nitro.scanResolvers.push(parsed)
        resolversAdded++
      }
    }
  }

  return { schemas: schemasAdded, resolvers: resolversAdded }
}
