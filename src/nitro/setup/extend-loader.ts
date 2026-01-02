/**
 * Extend configuration loader
 * Loads nitro-graphql.config.ts from packages and scans their serverDir
 */

import type { Nitro } from 'nitro/types'
import consola from 'consola'
import { dirname, resolve } from 'pathe'
import {
  loadPackageConfig,
  parseResolverCall,
  parseSingleFile,
  resolvePackageFiles,
} from '../../core'
import { LOG_TAG } from '../../core/constants'

const logger = consola.withTag(LOG_TAG)

interface ExtendResult {
  schemas: number
  resolvers: number
}

/**
 * Resolve extend directories for file watching
 * Called early in setup (before watcher) to get directories to watch
 */
export async function resolveExtendDirs(nitro: Nitro): Promise<string[]> {
  const extend = nitro.options.graphql?.extend
  if (!extend || !Array.isArray(extend) || extend.length === 0) return []

  const dirs: string[] = []

  for (const source of extend) {
    if (typeof source === 'string') {
      // Package name - load config and get serverDir
      const pkg = await loadPackageConfig(source, nitro.options.rootDir)
      if (pkg) {
        const serverDir = resolve(pkg.baseDir, pkg.config.serverDir || 'server/graphql')
        dirs.push(serverDir)
      }
    }
    else if (source && typeof source === 'object') {
      // Legacy: explicit paths - get parent directories
      const obj = source as { resolvers?: string | string[], schemas?: string | string[] }
      if (obj.schemas) {
        const schemas = Array.isArray(obj.schemas) ? obj.schemas : [obj.schemas]
        for (const schemaPath of schemas) {
          dirs.push(dirname(resolve(nitro.options.rootDir, schemaPath)))
        }
      }
      if (obj.resolvers) {
        const resolvers = Array.isArray(obj.resolvers) ? obj.resolvers : [obj.resolvers]
        for (const resolverPath of resolvers) {
          dirs.push(dirname(resolve(nitro.options.rootDir, resolverPath)))
        }
      }
    }
  }

  // Remove duplicates
  return [...new Set(dirs)]
}

interface ResolveExtendOptions {
  silent?: boolean
}

/**
 * Resolve extend configuration and add files to scan results
 * Must be called AFTER scanGraphQLFiles to append to results
 */
export async function resolveExtendConfig(nitro: Nitro, options: ResolveExtendOptions = {}): Promise<void> {
  const extend = nitro.options.graphql?.extend
  if (!extend || !Array.isArray(extend) || extend.length === 0) return

  let schemasAdded = 0
  let resolversAdded = 0

  for (const source of extend) {
    const result = await processExtendSource(source, nitro, options.silent)
    schemasAdded += result.schemas
    resolversAdded += result.resolvers
  }

  if (!options.silent && (schemasAdded > 0 || resolversAdded > 0)) {
    logger.info(`Extended with ${schemasAdded} schema(s), ${resolversAdded} resolver file(s)`)
  }
}

/**
 * Process a single extend source (package name or explicit config)
 */
async function processExtendSource(
  source: string | object,
  nitro: Nitro,
  silent?: boolean,
): Promise<ExtendResult> {
  if (typeof source === 'string') {
    return loadFromPackage(source, nitro, silent)
  }

  if (source && typeof source === 'object') {
    return processExplicitPaths(source as Record<string, unknown>, nitro)
  }

  return { schemas: 0, resolvers: 0 }
}

/**
 * Load and scan files from a package's nitro-graphql.config.ts
 */
async function loadFromPackage(
  packageName: string,
  nitro: Nitro,
  silent?: boolean,
): Promise<ExtendResult> {
  const pkg = await loadPackageConfig(packageName, nitro.options.rootDir)

  if (!pkg) {
    throw new Error(
      `[nitro-graphql] Config not found for "${packageName}". `
      + `Create a nitro-graphql.config.ts file in the package root.`,
    )
  }

  // Scan the package's serverDir for GraphQL files
  const files = await resolvePackageFiles(pkg)

  if (!silent) {
    logger.info(`Loaded config from ${packageName}`)
  }

  return addPackageFiles(files, nitro)
}

/**
 * Add files from a resolved package to scan results
 */
async function addPackageFiles(
  files: { schemas: string[], resolvers: string[], directives: string[] },
  nitro: Nitro,
): Promise<ExtendResult> {
  let schemasAdded = 0
  let resolversAdded = 0

  // Add schemas
  for (const schemaPath of files.schemas) {
    if (!nitro.scanSchemas.includes(schemaPath)) {
      nitro.scanSchemas.push(schemaPath)
      schemasAdded++
    }
  }

  // Parse and add resolvers
  for (const resolverPath of files.resolvers) {
    const parsed = await parseSingleFile(resolverPath, parseResolverCall)
    if (parsed?.imports.length) {
      nitro.scanResolvers.push(parsed)
      resolversAdded++
    }
  }

  return { schemas: schemasAdded, resolvers: resolversAdded }
}

/**
 * Process explicit paths (legacy format)
 */
async function processExplicitPaths(
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
